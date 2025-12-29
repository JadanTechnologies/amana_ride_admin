-- Location: supabase/migrations/20251222130629_realtime_sync_conflict_resolution.sql
-- Schema Analysis: Existing notification, audit, and staff tables detected
-- Integration Type: NEW MODULE - Conflict Resolution & Sync Management
-- Dependencies: staff_members (for user tracking)

-- ========================================
-- 1. TYPES & ENUMS
-- ========================================

CREATE TYPE public.conflict_resolution_strategy AS ENUM (
    'client_wins',
    'server_wins',
    'latest_timestamp_wins',
    'manual_resolution_required',
    'merge_changes'
);

CREATE TYPE public.sync_retry_status AS ENUM (
    'pending',
    'in_progress',
    'succeeded',
    'failed',
    'max_retries_reached',
    'cancelled'
);

CREATE TYPE public.data_validation_status AS ENUM (
    'valid',
    'invalid',
    'checksum_mismatch',
    'missing_data',
    'corrupted'
);

-- ========================================
-- 2. CORE TABLES
-- ========================================

-- Sync Conflict Logs - Persistent storage for all sync conflicts
CREATE TABLE public.sync_conflict_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Conflict Identification
    channel_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    conflict_type TEXT NOT NULL, -- 'network_disruption', 'concurrent_edit', 'stale_data', etc.
    
    -- Conflict Details
    client_version TEXT,
    server_version TEXT,
    client_data JSONB,
    server_data JSONB,
    conflict_fields TEXT[],
    
    -- Resolution
    resolution_strategy public.conflict_resolution_strategy DEFAULT 'manual_resolution_required'::public.conflict_resolution_strategy,
    resolution_data JSONB,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    
    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    auto_resolved BOOLEAN DEFAULT false,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sync Retry Queue - Automatic retry management
CREATE TABLE public.sync_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Operation Details
    channel_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'insert', 'update', 'delete', 'subscribe'
    operation_data JSONB NOT NULL,
    record_id UUID,
    
    -- Retry Configuration
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    retry_delay_ms INTEGER DEFAULT 1000,
    exponential_backoff BOOLEAN DEFAULT true,
    backoff_multiplier NUMERIC(3,2) DEFAULT 2.0,
    
    -- Status Tracking
    status public.sync_retry_status DEFAULT 'pending'::public.sync_retry_status,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Priority
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

-- Data Validation Checksums - Data integrity verification
CREATE TABLE public.data_validation_checksums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Data Identification
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    channel_name TEXT NOT NULL,
    
    -- Checksum Details
    checksum TEXT NOT NULL, -- SHA-256 or MD5 hash
    checksum_algorithm TEXT DEFAULT 'sha256',
    data_snapshot JSONB, -- Optional: Store snapshot for comparison
    
    -- Validation
    validation_status public.data_validation_status DEFAULT 'valid'::public.data_validation_status,
    last_validated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    validation_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique checksum per record per channel
    UNIQUE(table_name, record_id, channel_name)
);

-- Conflict Resolution Policies - Define how to handle conflicts
CREATE TABLE public.conflict_resolution_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Policy Identification
    policy_name TEXT NOT NULL UNIQUE,
    table_name TEXT NOT NULL,
    conflict_type TEXT NOT NULL,
    
    -- Strategy Configuration
    resolution_strategy public.conflict_resolution_strategy NOT NULL,
    auto_resolve BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5,
    
    -- Conditions (JSONB for flexible rule matching)
    match_conditions JSONB, -- e.g., {"severity": ["high", "critical"], "user_role": "admin"}
    
    -- Actions
    on_conflict_actions JSONB, -- e.g., {"notify_user": true, "log_to_slack": false}
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. INDEXES
-- ========================================

-- Sync Conflict Logs Indexes
CREATE INDEX idx_sync_conflict_logs_channel ON public.sync_conflict_logs(channel_name);
CREATE INDEX idx_sync_conflict_logs_table ON public.sync_conflict_logs(table_name);
CREATE INDEX idx_sync_conflict_logs_detected_at ON public.sync_conflict_logs(detected_at DESC);
CREATE INDEX idx_sync_conflict_logs_resolved ON public.sync_conflict_logs(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX idx_sync_conflict_logs_severity ON public.sync_conflict_logs(severity);

-- Sync Retry Queue Indexes
CREATE INDEX idx_sync_retry_queue_status ON public.sync_retry_queue(status);
CREATE INDEX idx_sync_retry_queue_next_retry ON public.sync_retry_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_sync_retry_queue_priority ON public.sync_retry_queue(priority, created_at);
CREATE INDEX idx_sync_retry_queue_channel ON public.sync_retry_queue(channel_name);

-- Data Validation Checksums Indexes
CREATE INDEX idx_data_validation_table_record ON public.data_validation_checksums(table_name, record_id);
CREATE INDEX idx_data_validation_status ON public.data_validation_checksums(validation_status);
CREATE INDEX idx_data_validation_channel ON public.data_validation_checksums(channel_name);

-- Conflict Resolution Policies Indexes
CREATE INDEX idx_conflict_policies_table ON public.conflict_resolution_policies(table_name);
CREATE INDEX idx_conflict_policies_active ON public.conflict_resolution_policies(is_active) WHERE is_active = true;

-- ========================================
-- 4. FUNCTIONS
-- ========================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_sync_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$;

-- Calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION public.calculate_next_retry_time(
    retry_count_param INTEGER,
    base_delay_ms_param INTEGER,
    exponential_backoff_param BOOLEAN,
    backoff_multiplier_param NUMERIC
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
    delay_ms INTEGER;
    max_delay_ms INTEGER := 300000; -- 5 minutes max delay
BEGIN
    IF exponential_backoff_param THEN
        -- Exponential backoff: base_delay * (multiplier ^ retry_count)
        delay_ms := LEAST(
            base_delay_ms_param * POWER(backoff_multiplier_param, retry_count_param)::INTEGER,
            max_delay_ms
        );
    ELSE
        -- Linear backoff
        delay_ms := base_delay_ms_param;
    END IF;
    
    RETURN CURRENT_TIMESTAMP + (delay_ms || ' milliseconds')::INTERVAL;
END;
$func$;

-- Get matching resolution policy for a conflict
CREATE OR REPLACE FUNCTION public.get_resolution_policy_for_conflict(
    table_name_param TEXT,
    conflict_type_param TEXT,
    severity_param TEXT
)
RETURNS public.conflict_resolution_policies
LANGUAGE sql
STABLE
AS $func$
    SELECT *
    FROM public.conflict_resolution_policies
    WHERE table_name = table_name_param
      AND conflict_type = conflict_type_param
      AND is_active = true
    ORDER BY priority ASC
    LIMIT 1;
$func$;

-- Auto-resolve conflicts based on policies
CREATE OR REPLACE FUNCTION public.auto_resolve_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    matching_policy public.conflict_resolution_policies;
BEGIN
    -- Try to find matching policy
    SELECT * INTO matching_policy
    FROM public.conflict_resolution_policies
    WHERE table_name = NEW.table_name
      AND conflict_type = NEW.conflict_type
      AND is_active = true
      AND auto_resolve = true
    ORDER BY priority ASC
    LIMIT 1;
    
    IF matching_policy IS NOT NULL THEN
        -- Apply resolution strategy
        NEW.resolution_strategy := matching_policy.resolution_strategy;
        
        -- Attempt auto-resolution based on strategy
        CASE matching_policy.resolution_strategy
            WHEN 'latest_timestamp_wins' THEN
                -- Compare timestamps and pick latest
                IF (NEW.server_data->>'updated_at')::TIMESTAMPTZ > (NEW.client_data->>'updated_at')::TIMESTAMPTZ THEN
                    NEW.resolution_data := NEW.server_data;
                ELSE
                    NEW.resolution_data := NEW.client_data;
                END IF;
                NEW.auto_resolved := true;
                NEW.resolved_at := CURRENT_TIMESTAMP;
                
            WHEN 'server_wins' THEN
                NEW.resolution_data := NEW.server_data;
                NEW.auto_resolved := true;
                NEW.resolved_at := CURRENT_TIMESTAMP;
                
            WHEN 'client_wins' THEN
                NEW.resolution_data := NEW.client_data;
                NEW.auto_resolved := true;
                NEW.resolved_at := CURRENT_TIMESTAMP;
            
            ELSE
                -- Manual resolution required
                NEW.auto_resolved := false;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$func$;

-- ========================================
-- 5. TRIGGERS
-- ========================================

-- Update timestamp triggers
CREATE TRIGGER update_sync_conflict_logs_updated_at
    BEFORE UPDATE ON public.sync_conflict_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sync_updated_at();

CREATE TRIGGER update_sync_retry_queue_updated_at
    BEFORE UPDATE ON public.sync_retry_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sync_updated_at();

CREATE TRIGGER update_data_validation_checksums_updated_at
    BEFORE UPDATE ON public.data_validation_checksums
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sync_updated_at();

CREATE TRIGGER update_conflict_resolution_policies_updated_at
    BEFORE UPDATE ON public.conflict_resolution_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sync_updated_at();

-- Auto-resolve conflicts on insert
CREATE TRIGGER auto_resolve_conflict_trigger
    BEFORE INSERT ON public.sync_conflict_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_resolve_conflict();

-- ========================================
-- 6. RLS POLICIES
-- ========================================

-- Enable RLS
ALTER TABLE public.sync_conflict_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_validation_checksums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_resolution_policies ENABLE ROW LEVEL SECURITY;

-- Pattern 4: Public read access for monitoring, authenticated users can write
CREATE POLICY "authenticated_users_can_read_conflict_logs"
ON public.sync_conflict_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_conflict_logs"
ON public.sync_conflict_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_conflict_logs"
ON public.sync_conflict_logs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Retry queue - authenticated users can manage their operations
CREATE POLICY "authenticated_users_manage_retry_queue"
ON public.sync_retry_queue
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Data validation - authenticated users can verify their data
CREATE POLICY "authenticated_users_manage_checksums"
ON public.data_validation_checksums
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Resolution policies - read-only for authenticated users
CREATE POLICY "authenticated_users_can_read_policies"
ON public.conflict_resolution_policies
FOR SELECT
TO authenticated
USING (is_active = true);

-- ========================================
-- 7. MOCK DATA
-- ========================================

DO $$
DECLARE
    test_channel TEXT := 'dashboard-realtime';
    test_table TEXT := 'system_notifications';
    test_record_id UUID := gen_random_uuid();
BEGIN
    -- Create sample conflict resolution policies
    INSERT INTO public.conflict_resolution_policies 
    (policy_name, table_name, conflict_type, resolution_strategy, auto_resolve, priority)
    VALUES
        ('Network Disruption - Latest Wins', test_table, 'network_disruption', 
         'latest_timestamp_wins'::public.conflict_resolution_strategy, true, 1),
        ('Concurrent Edit - Server Wins', test_table, 'concurrent_edit', 
         'server_wins'::public.conflict_resolution_strategy, true, 2),
        ('Stale Data - Manual Review', test_table, 'stale_data', 
         'manual_resolution_required'::public.conflict_resolution_strategy, false, 3);
    
    -- Create sample conflict log (demonstrates auto-resolution via trigger)
    INSERT INTO public.sync_conflict_logs 
    (channel_name, table_name, record_id, conflict_type, severity,
     client_data, server_data, conflict_fields)
    VALUES
        (test_channel, test_table, test_record_id, 'network_disruption', 'medium',
         '{"title": "Test Notification", "updated_at": "2025-12-22T13:00:00Z"}'::JSONB,
         '{"title": "Test Notification Updated", "updated_at": "2025-12-22T13:05:00Z"}'::JSONB,
         ARRAY['title', 'updated_at']);
    
    -- Create sample retry queue items using jsonb_build_object for proper JSON construction
    INSERT INTO public.sync_retry_queue 
    (channel_name, table_name, operation_type, operation_data, priority, next_retry_at)
    VALUES
        (test_channel, test_table, 'update', 
         jsonb_build_object('id', test_record_id::TEXT, 'status', 'read'), 
         3, CURRENT_TIMESTAMP + INTERVAL '5 seconds'),
        (test_channel, 'system_settings', 'insert', 
         jsonb_build_object('setting_key', 'max_connections', 'setting_value', '100'), 
         5, CURRENT_TIMESTAMP + INTERVAL '10 seconds');
    
    -- Create sample checksum
    INSERT INTO public.data_validation_checksums 
    (table_name, record_id, channel_name, checksum, data_snapshot)
    VALUES
        (test_table, test_record_id, test_channel, 
         'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 
         '{"title": "Test Notification", "status": "unread"}'::JSONB);
    
    RAISE NOTICE 'Sync conflict resolution mock data created successfully';
    RAISE NOTICE 'Sample policies: %, conflict logs: %, retry items: %', 
                 (SELECT COUNT(*) FROM public.conflict_resolution_policies),
                 (SELECT COUNT(*) FROM public.sync_conflict_logs),
                 (SELECT COUNT(*) FROM public.sync_retry_queue);
END $$;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE public.sync_conflict_logs IS 'Stores all real-time sync conflicts with resolution tracking';
COMMENT ON TABLE public.sync_retry_queue IS 'Manages automatic retry operations for failed sync attempts';
COMMENT ON TABLE public.data_validation_checksums IS 'Tracks data integrity checksums for validation';
COMMENT ON TABLE public.conflict_resolution_policies IS 'Defines automatic conflict resolution strategies';
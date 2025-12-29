-- Location: supabase/migrations/20251222124022_data_backup_recovery_module.sql
-- Schema Analysis: Existing schema contains staff_members, roles, audit_logs
-- Integration Type: NEW_MODULE - Adding backup and recovery management
-- Dependencies: staff_members (for created_by relationships)

-- 1. Create ENUM types for backup management
CREATE TYPE public.backup_type AS ENUM ('full', 'incremental', 'differential');
CREATE TYPE public.backup_status AS ENUM ('active', 'completed', 'failed', 'in_progress');
CREATE TYPE public.backup_frequency AS ENUM ('hourly', 'daily', 'weekly', 'monthly', 'custom');
CREATE TYPE public.recovery_test_status AS ENUM ('pending', 'in_progress', 'passed', 'failed');
CREATE TYPE public.storage_location AS ENUM ('local', 'cloud_primary', 'cloud_secondary', 'archive');

-- 2. Core backup configuration table
CREATE TABLE public.backup_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name TEXT NOT NULL,
    backup_type public.backup_type NOT NULL,
    frequency public.backup_frequency NOT NULL,
    schedule_config JSONB NOT NULL DEFAULT '{}'::JSONB,
    retention_policy_days INTEGER NOT NULL DEFAULT 30,
    storage_location public.storage_location NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    next_scheduled_run TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ
);

-- 3. Backup execution history table
CREATE TABLE public.backup_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID REFERENCES public.backup_configurations(id) ON DELETE CASCADE,
    execution_status public.backup_status NOT NULL,
    backup_size_bytes BIGINT DEFAULT 0,
    backup_location TEXT,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    verification_status BOOLEAN DEFAULT false,
    replicated_to JSONB DEFAULT '[]'::JSONB
);

-- 4. Point-in-time recovery tracking
CREATE TABLE public.recovery_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_execution_id UUID REFERENCES public.backup_executions(id) ON DELETE CASCADE,
    recovery_point_timestamp TIMESTAMPTZ NOT NULL,
    data_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
    affected_tables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    size_bytes BIGINT DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Recovery testing results table
CREATE TABLE public.recovery_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_execution_id UUID REFERENCES public.backup_executions(id) ON DELETE CASCADE,
    test_status public.recovery_test_status NOT NULL,
    test_type TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    success_rate DECIMAL(5,2),
    issues_found INTEGER DEFAULT 0,
    test_results JSONB DEFAULT '{}'::JSONB,
    performed_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL
);

-- 6. Backup audit trail table
CREATE TABLE public.backup_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    performed_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    action_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    changes JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,
    user_agent TEXT,
    compliance_flags JSONB DEFAULT '{}'::JSONB
);

-- 7. Create indexes for performance
CREATE INDEX idx_backup_configurations_created_by ON public.backup_configurations(created_by);
CREATE INDEX idx_backup_configurations_next_run ON public.backup_configurations(next_scheduled_run);
CREATE INDEX idx_backup_executions_configuration_id ON public.backup_executions(configuration_id);
CREATE INDEX idx_backup_executions_status ON public.backup_executions(execution_status);
CREATE INDEX idx_backup_executions_started_at ON public.backup_executions(started_at);
CREATE INDEX idx_recovery_points_backup_execution_id ON public.recovery_points(backup_execution_id);
CREATE INDEX idx_recovery_points_timestamp ON public.recovery_points(recovery_point_timestamp);
CREATE INDEX idx_recovery_tests_backup_execution_id ON public.recovery_tests(backup_execution_id);
CREATE INDEX idx_recovery_tests_status ON public.recovery_tests(test_status);
CREATE INDEX idx_backup_audit_trail_performed_by ON public.backup_audit_trail(performed_by);
CREATE INDEX idx_backup_audit_trail_timestamp ON public.backup_audit_trail(action_timestamp);

-- 8. Enable RLS on all tables
ALTER TABLE public.backup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_audit_trail ENABLE ROW LEVEL SECURITY;

-- 9. Helper function for admin role check
CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.staff_members sm
    JOIN public.roles r ON sm.role_id = r.id
    WHERE sm.id = auth.uid() 
    AND r.name IN ('super_admin', 'system_admin')
)
$$;

-- 10. RLS Policies using admin check function
CREATE POLICY "admin_full_access_backup_configurations"
ON public.backup_configurations
FOR ALL
TO authenticated
USING (public.is_super_admin_user())
WITH CHECK (public.is_super_admin_user());

CREATE POLICY "admin_full_access_backup_executions"
ON public.backup_executions
FOR ALL
TO authenticated
USING (public.is_super_admin_user())
WITH CHECK (public.is_super_admin_user());

CREATE POLICY "admin_full_access_recovery_points"
ON public.recovery_points
FOR ALL
TO authenticated
USING (public.is_super_admin_user())
WITH CHECK (public.is_super_admin_user());

CREATE POLICY "admin_full_access_recovery_tests"
ON public.recovery_tests
FOR ALL
TO authenticated
USING (public.is_super_admin_user())
WITH CHECK (public.is_super_admin_user());

CREATE POLICY "admin_full_access_backup_audit_trail"
ON public.backup_audit_trail
FOR ALL
TO authenticated
USING (public.is_super_admin_user())
WITH CHECK (public.is_super_admin_user());

-- 11. Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_backup_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_backup_configurations_updated_at
BEFORE UPDATE ON public.backup_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_backup_updated_at();

-- 12. Mock data for demonstration
DO $$
DECLARE
    admin_staff_id UUID;
    config1_id UUID := gen_random_uuid();
    config2_id UUID := gen_random_uuid();
    exec1_id UUID := gen_random_uuid();
    exec2_id UUID := gen_random_uuid();
BEGIN
    -- Get existing super admin staff member
    SELECT sm.id INTO admin_staff_id
    FROM public.staff_members sm
    JOIN public.roles r ON sm.role_id = r.id
    WHERE r.name = 'super_admin'
    LIMIT 1;
    
    -- Create backup configurations
    INSERT INTO public.backup_configurations (
        id, backup_name, backup_type, frequency, schedule_config, 
        retention_policy_days, storage_location, created_by, next_scheduled_run
    ) VALUES
        (config1_id, 'Daily Full System Backup', 'full'::public.backup_type, 'daily'::public.backup_frequency,
         '{"time": "02:00", "timezone": "UTC"}'::JSONB, 90, 'cloud_primary'::public.storage_location,
         admin_staff_id, CURRENT_TIMESTAMP + INTERVAL '1 day'),
        (config2_id, 'Hourly Incremental Backup', 'incremental'::public.backup_type, 'hourly'::public.backup_frequency,
         '{"interval": 1}'::JSONB, 7, 'local'::public.storage_location,
         admin_staff_id, CURRENT_TIMESTAMP + INTERVAL '1 hour');
    
    -- Create backup executions
    INSERT INTO public.backup_executions (
        id, configuration_id, execution_status, backup_size_bytes, 
        backup_location, started_at, completed_at, duration_seconds, verification_status
    ) VALUES
        (exec1_id, config1_id, 'completed'::public.backup_status, 52428800000,
         '/backups/2025-12-22/full_backup_02.tar.gz', 
         CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour', 3600, true),
        (exec2_id, config2_id, 'completed'::public.backup_status, 5242880000,
         '/backups/2025-12-22/incremental_11.tar.gz',
         CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP - INTERVAL '15 minutes', 900, true);
    
    -- Create recovery points
    INSERT INTO public.recovery_points (
        backup_execution_id, recovery_point_timestamp, data_snapshot,
        affected_tables, size_bytes, is_verified
    ) VALUES
        (exec1_id, CURRENT_TIMESTAMP - INTERVAL '1 hour',
         '{"tables": 17, "records": 125000}'::JSONB,
         ARRAY['users', 'staff_members', 'roles', 'audit_logs', 'system_settings']::TEXT[],
         52428800000, true),
        (exec2_id, CURRENT_TIMESTAMP - INTERVAL '15 minutes',
         '{"tables": 5, "records": 2340}'::JSONB,
         ARRAY['audit_logs', 'system_notifications']::TEXT[],
         5242880000, true);
    
    -- Create recovery tests
    INSERT INTO public.recovery_tests (
        backup_execution_id, test_status, test_type,
        started_at, completed_at, duration_seconds, success_rate, issues_found, performed_by
    ) VALUES
        (exec1_id, 'passed'::public.recovery_test_status, 'integrity_check',
         CURRENT_TIMESTAMP - INTERVAL '45 minutes', CURRENT_TIMESTAMP - INTERVAL '40 minutes',
         300, 100.00, 0, admin_staff_id),
        (exec2_id, 'passed'::public.recovery_test_status, 'restore_validation',
         CURRENT_TIMESTAMP - INTERVAL '10 minutes', CURRENT_TIMESTAMP - INTERVAL '5 minutes',
         300, 98.50, 2, admin_staff_id);
    
    -- Create audit trail entries
    INSERT INTO public.backup_audit_trail (
        action, entity_type, entity_id, performed_by, changes
    ) VALUES
        ('backup_created', 'backup_configuration', config1_id, admin_staff_id,
         '{"name": "Daily Full System Backup", "status": "active"}'::JSONB),
        ('backup_executed', 'backup_execution', exec1_id, admin_staff_id,
         '{"status": "completed", "size": 52428800000}'::JSONB),
        ('recovery_test_completed', 'recovery_test', exec1_id, admin_staff_id,
         '{"status": "passed", "success_rate": 100}'::JSONB);
END $$;

-- 13. Comments for documentation
COMMENT ON TABLE public.backup_configurations IS 'Stores backup schedule configurations and retention policies';
COMMENT ON TABLE public.backup_executions IS 'Tracks all backup execution history and status';
COMMENT ON TABLE public.recovery_points IS 'Maintains point-in-time recovery snapshots';
COMMENT ON TABLE public.recovery_tests IS 'Records recovery testing results and compliance';
COMMENT ON TABLE public.backup_audit_trail IS 'Comprehensive audit trail for backup operations';
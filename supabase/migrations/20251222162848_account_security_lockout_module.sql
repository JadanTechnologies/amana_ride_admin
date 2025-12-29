-- Location: supabase/migrations/20251222162848_account_security_lockout_module.sql
-- Schema Analysis: Existing security infrastructure with MFA, audit logs, and notifications
-- Integration Type: Extension - Adding login attempt tracking and automated security alerts
-- Dependencies: user_mfa_settings, security_policies, system_notifications, staff_members

-- =====================================================
-- 1. CUSTOM TYPES FOR SECURITY MODULE
-- =====================================================

-- Login attempt result enum
CREATE TYPE public.login_attempt_result AS ENUM (
    'success',
    'failed_password',
    'failed_mfa',
    'account_locked',
    'account_disabled',
    'role_restricted'
);

-- Security alert severity enum  
CREATE TYPE public.security_alert_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- Alert status enum
CREATE TYPE public.alert_status AS ENUM (
    'open',
    'acknowledged',
    'investigating',
    'resolved',
    'false_positive'
);

-- =====================================================
-- 2. CORE SECURITY TABLES
-- =====================================================

-- Login attempts tracking table
CREATE TABLE public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT NOT NULL,
    attempt_result public.login_attempt_result NOT NULL,
    ip_address INET,
    user_agent TEXT,
    location_data JSONB,
    device_fingerprint TEXT,
    failure_reason TEXT,
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.login_attempts IS 'Comprehensive tracking of all login attempts for security monitoring';

-- Account lockout rules configuration
CREATE TABLE public.account_lockout_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    description TEXT,
    max_failed_attempts INTEGER NOT NULL DEFAULT 5,
    lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
    attempt_window_minutes INTEGER NOT NULL DEFAULT 15,
    applies_to_roles TEXT[] DEFAULT ARRAY['all']::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.staff_members(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES public.staff_members(id)
);

COMMENT ON TABLE public.account_lockout_rules IS 'Configurable rules for automatic account lockout on suspicious activity';

-- Suspicious activity patterns
CREATE TABLE public.suspicious_activity_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name TEXT NOT NULL UNIQUE,
    description TEXT,
    detection_criteria JSONB NOT NULL,
    severity public.security_alert_severity NOT NULL,
    auto_lockout BOOLEAN DEFAULT false,
    notification_channels TEXT[] DEFAULT ARRAY['email', 'system']::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.staff_members(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.suspicious_activity_patterns IS 'Defines patterns that trigger security alerts';

-- Security alerts table
CREATE TABLE public.security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity public.security_alert_severity NOT NULL,
    status public.alert_status DEFAULT 'open'::public.alert_status,
    user_id UUID,
    email TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detection_details JSONB,
    ip_address INET,
    location_data JSONB,
    triggered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.staff_members(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.staff_members(id),
    resolution_notes TEXT,
    auto_generated BOOLEAN DEFAULT true,
    related_attempts UUID[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.security_alerts IS 'Security alerts generated from suspicious activity detection';

-- Account lockout history
CREATE TABLE public.account_lockout_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMPTZ NOT NULL,
    lockout_reason TEXT NOT NULL,
    rule_triggered TEXT,
    failed_attempts_count INTEGER,
    unlocked_at TIMESTAMPTZ,
    unlocked_by UUID REFERENCES public.staff_members(id),
    unlock_reason TEXT,
    ip_addresses INET[],
    metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.account_lockout_history IS 'Historical record of all account lockouts';

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_result ON public.login_attempts(attempt_result);
CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts(attempted_at DESC);
CREATE INDEX idx_login_attempts_ip_address ON public.login_attempts(ip_address);

CREATE INDEX idx_account_lockout_rules_active ON public.account_lockout_rules(is_active);

CREATE INDEX idx_suspicious_patterns_active ON public.suspicious_activity_patterns(is_active);
CREATE INDEX idx_suspicious_patterns_severity ON public.suspicious_activity_patterns(severity);

CREATE INDEX idx_security_alerts_status ON public.security_alerts(status);
CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX idx_security_alerts_user_id ON public.security_alerts(user_id);
CREATE INDEX idx_security_alerts_triggered_at ON public.security_alerts(triggered_at DESC);

CREATE INDEX idx_lockout_history_user_id ON public.account_lockout_history(user_id);
CREATE INDEX idx_lockout_history_locked_at ON public.account_lockout_history(locked_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockout_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_activity_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockout_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. SECURITY FUNCTIONS (MUST BE BEFORE POLICIES)
-- =====================================================

-- Check if user is super admin for security management
CREATE OR REPLACE FUNCTION public.is_security_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (
        au.raw_user_meta_data->>'role' = 'super_admin' 
        OR au.raw_app_meta_data->>'role' = 'super_admin'
    )
)
$$;

-- Function to check if account should be locked
CREATE OR REPLACE FUNCTION public.should_lock_account(
    p_user_id UUID,
    p_email TEXT
)
RETURNS TABLE(
    should_lock BOOLEAN,
    rule_name TEXT,
    lockout_duration_minutes INTEGER,
    failed_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_rule RECORD;
    v_failed_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    -- Loop through active lockout rules
    FOR v_rule IN 
        SELECT * FROM public.account_lockout_rules 
        WHERE is_active = true 
        ORDER BY max_failed_attempts ASC
    LOOP
        v_window_start := CURRENT_TIMESTAMP - (v_rule.attempt_window_minutes || ' minutes')::INTERVAL;
        
        -- Count failed attempts in window
        SELECT COUNT(*) INTO v_failed_count
        FROM public.login_attempts
        WHERE email = p_email
        AND attempt_result IN ('failed_password', 'failed_mfa')
        AND attempted_at >= v_window_start;
        
        -- Check if threshold exceeded
        IF v_failed_count >= v_rule.max_failed_attempts THEN
            RETURN QUERY SELECT 
                true::BOOLEAN,
                v_rule.rule_name,
                v_rule.lockout_duration_minutes,
                v_failed_count;
            RETURN;
        END IF;
    END LOOP;
    
    -- No lockout needed
    RETURN QUERY SELECT false::BOOLEAN, NULL::TEXT, NULL::INTEGER, v_failed_count;
END;
$$;

-- Function to detect suspicious patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
    p_user_id UUID,
    p_email TEXT,
    p_ip_address INET,
    p_location_data JSONB
)
RETURNS TABLE(
    pattern_detected BOOLEAN,
    pattern_name TEXT,
    severity public.security_alert_severity,
    should_alert BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_pattern RECORD;
    v_recent_ips INTEGER;
    v_recent_locations INTEGER;
    v_rapid_attempts INTEGER;
BEGIN
    -- Check each active suspicious pattern
    FOR v_pattern IN 
        SELECT * FROM public.suspicious_activity_patterns 
        WHERE is_active = true
    LOOP
        -- Multiple IP addresses pattern
        IF v_pattern.detection_criteria->>'type' = 'multiple_ips' THEN
            SELECT COUNT(DISTINCT ip_address) INTO v_recent_ips
            FROM public.login_attempts
            WHERE email = p_email
            AND attempted_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour';
            
            IF v_recent_ips >= (v_pattern.detection_criteria->>'threshold')::INTEGER THEN
                RETURN QUERY SELECT 
                    true::BOOLEAN,
                    v_pattern.pattern_name,
                    v_pattern.severity,
                    true::BOOLEAN;
                RETURN;
            END IF;
        END IF;
        
        -- Rapid successive attempts pattern
        IF v_pattern.detection_criteria->>'type' = 'rapid_attempts' THEN
            SELECT COUNT(*) INTO v_rapid_attempts
            FROM public.login_attempts
            WHERE email = p_email
            AND attempted_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes';
            
            IF v_rapid_attempts >= (v_pattern.detection_criteria->>'threshold')::INTEGER THEN
                RETURN QUERY SELECT 
                    true::BOOLEAN,
                    v_pattern.pattern_name,
                    v_pattern.severity,
                    true::BOOLEAN;
                RETURN;
            END IF;
        END IF;
    END LOOP;
    
    -- No suspicious activity detected
    RETURN QUERY SELECT false::BOOLEAN, NULL::TEXT, NULL::public.security_alert_severity, false::BOOLEAN;
END;
$$;

-- Function to create security alert
CREATE OR REPLACE FUNCTION public.create_security_alert(
    p_alert_type TEXT,
    p_severity public.security_alert_severity,
    p_user_id UUID,
    p_email TEXT,
    p_title TEXT,
    p_description TEXT,
    p_detection_details JSONB,
    p_ip_address INET DEFAULT NULL,
    p_location_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_alert_id UUID;
    v_notification_id UUID;
BEGIN
    -- Create security alert
    INSERT INTO public.security_alerts (
        alert_type,
        severity,
        user_id,
        email,
        title,
        description,
        detection_details,
        ip_address,
        location_data,
        auto_generated
    ) VALUES (
        p_alert_type,
        p_severity,
        p_user_id,
        p_email,
        p_title,
        p_description,
        p_detection_details,
        p_ip_address,
        p_location_data,
        true
    ) RETURNING id INTO v_alert_id;
    
    -- Create corresponding system notification for critical alerts
    IF p_severity IN ('high', 'critical') THEN
        INSERT INTO public.system_notifications (
            category,
            priority,
            title,
            description,
            source_system,
            metadata
        ) VALUES (
            'security'::public.notification_category,
            CASE 
                WHEN p_severity = 'critical' THEN 'critical'::public.notification_priority
                WHEN p_severity = 'high' THEN 'high'::public.notification_priority
                ELSE 'medium'::public.notification_priority
            END,
            p_title,
            p_description,
            'Security Monitoring System',
            jsonb_build_object(
                'alert_id', v_alert_id,
                'alert_type', p_alert_type,
                'severity', p_severity,
                'user_email', p_email
            )
        ) RETURNING id INTO v_notification_id;
    END IF;
    
    RETURN v_alert_id;
END;
$$;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Login attempts - admins only
CREATE POLICY "security_admins_full_access_login_attempts"
ON public.login_attempts
FOR ALL
TO authenticated
USING (public.is_security_admin())
WITH CHECK (public.is_security_admin());

-- Account lockout rules - admins only
CREATE POLICY "security_admins_manage_lockout_rules"
ON public.account_lockout_rules
FOR ALL
TO authenticated
USING (public.is_security_admin())
WITH CHECK (public.is_security_admin());

-- Suspicious activity patterns - admins only
CREATE POLICY "security_admins_manage_patterns"
ON public.suspicious_activity_patterns
FOR ALL
TO authenticated
USING (public.is_security_admin())
WITH CHECK (public.is_security_admin());

-- Security alerts - admins can view/manage all
CREATE POLICY "security_admins_manage_alerts"
ON public.security_alerts
FOR ALL
TO authenticated
USING (public.is_security_admin())
WITH CHECK (public.is_security_admin());

-- Account lockout history - admins only
CREATE POLICY "security_admins_view_lockout_history"
ON public.account_lockout_history
FOR ALL
TO authenticated
USING (public.is_security_admin())
WITH CHECK (public.is_security_admin());

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update timestamps trigger
CREATE TRIGGER update_account_lockout_rules_updated_at
    BEFORE UPDATE ON public.account_lockout_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suspicious_patterns_updated_at
    BEFORE UPDATE ON public.suspicious_activity_patterns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_alerts_updated_at
    BEFORE UPDATE ON public.security_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. INITIAL CONFIGURATION DATA
-- =====================================================

-- Default lockout rules
INSERT INTO public.account_lockout_rules (
    rule_name,
    description,
    max_failed_attempts,
    lockout_duration_minutes,
    attempt_window_minutes,
    applies_to_roles
) VALUES
    (
        'Standard Admin Lockout',
        'Standard protection for admin accounts - 5 failed attempts in 15 minutes results in 30 minute lockout',
        5,
        30,
        15,
        ARRAY['super_admin', 'admin', 'manager']::TEXT[]
    ),
    (
        'Enhanced Security Lockout',
        'Enhanced protection for sensitive accounts - 3 failed attempts in 10 minutes results in 60 minute lockout',
        3,
        60,
        10,
        ARRAY['super_admin']::TEXT[]
    );

-- Default suspicious activity patterns
INSERT INTO public.suspicious_activity_patterns (
    pattern_name,
    description,
    detection_criteria,
    severity,
    auto_lockout,
    notification_channels
) VALUES
    (
        'Multiple IP Addresses',
        'Login attempts from 3+ different IP addresses within 1 hour',
        '{"type": "multiple_ips", "threshold": 3, "window_minutes": 60}'::jsonb,
        'high'::public.security_alert_severity,
        true,
        ARRAY['email', 'system']::TEXT[]
    ),
    (
        'Rapid Login Attempts',
        'More than 10 login attempts within 5 minutes',
        '{"type": "rapid_attempts", "threshold": 10, "window_minutes": 5}'::jsonb,
        'critical'::public.security_alert_severity,
        true,
        ARRAY['email', 'system', 'sms']::TEXT[]
    ),
    (
        'Geographic Anomaly',
        'Login attempts from distant geographic locations within short timeframe',
        '{"type": "geographic_distance", "threshold_km": 500, "window_minutes": 30}'::jsonb,
        'medium'::public.security_alert_severity,
        false,
        ARRAY['email', 'system']::TEXT[]
    );

-- =====================================================
-- 9. HELPER FUNCTIONS FOR APPLICATION LAYER
-- =====================================================

-- Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
    p_user_id UUID,
    p_email TEXT,
    p_result public.login_attempt_result,
    p_ip_address INET,
    p_user_agent TEXT,
    p_location_data JSONB DEFAULT NULL,
    p_device_fingerprint TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempt_id UUID;
    v_lockout_check RECORD;
    v_suspicious_check RECORD;
    v_lockout_until TIMESTAMPTZ;
BEGIN
    -- Record the login attempt
    INSERT INTO public.login_attempts (
        user_id,
        email,
        attempt_result,
        ip_address,
        user_agent,
        location_data,
        device_fingerprint,
        failure_reason,
        session_id
    ) VALUES (
        p_user_id,
        p_email,
        p_result,
        p_ip_address,
        p_user_agent,
        p_location_data,
        p_device_fingerprint,
        p_failure_reason,
        p_session_id
    ) RETURNING id INTO v_attempt_id;
    
    -- Only perform security checks on failed attempts
    IF p_result IN ('failed_password', 'failed_mfa') THEN
        -- Check if account should be locked
        SELECT * INTO v_lockout_check
        FROM public.should_lock_account(p_user_id, p_email);
        
        IF v_lockout_check.should_lock THEN
            v_lockout_until := CURRENT_TIMESTAMP + (v_lockout_check.lockout_duration_minutes || ' minutes')::INTERVAL;
            
            -- Record lockout
            INSERT INTO public.account_lockout_history (
                user_id,
                email,
                locked_until,
                lockout_reason,
                rule_triggered,
                failed_attempts_count
            ) VALUES (
                p_user_id,
                p_email,
                v_lockout_until,
                'Exceeded maximum failed login attempts',
                v_lockout_check.rule_name,
                v_lockout_check.failed_count
            );
            
            -- Update user_mfa_settings if exists
            UPDATE public.user_mfa_settings
            SET locked_until = v_lockout_until
            WHERE user_id = p_user_id;
            
            -- Create security alert
            PERFORM public.create_security_alert(
                'account_locked',
                'high'::public.security_alert_severity,
                p_user_id,
                p_email,
                'Account Locked - Multiple Failed Attempts',
                format('Account locked until %s due to %s failed login attempts', 
                       v_lockout_until::TEXT, 
                       v_lockout_check.failed_count::TEXT),
                jsonb_build_object(
                    'rule', v_lockout_check.rule_name,
                    'failed_attempts', v_lockout_check.failed_count,
                    'locked_until', v_lockout_until
                ),
                p_ip_address,
                p_location_data
            );
        END IF;
        
        -- Check for suspicious activity patterns
        SELECT * INTO v_suspicious_check
        FROM public.detect_suspicious_activity(p_user_id, p_email, p_ip_address, p_location_data);
        
        IF v_suspicious_check.pattern_detected AND v_suspicious_check.should_alert THEN
            PERFORM public.create_security_alert(
                'suspicious_activity',
                v_suspicious_check.severity,
                p_user_id,
                p_email,
                format('Suspicious Activity Detected - %s', v_suspicious_check.pattern_name),
                format('Suspicious login pattern detected: %s', v_suspicious_check.pattern_name),
                jsonb_build_object(
                    'pattern', v_suspicious_check.pattern_name,
                    'severity', v_suspicious_check.severity,
                    'ip_address', p_ip_address,
                    'location', p_location_data
                ),
                p_ip_address,
                p_location_data
            );
        END IF;
    END IF;
    
    RETURN v_attempt_id;
END;
$$;

-- Function to check if account is currently locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_email TEXT)
RETURNS TABLE(
    is_locked BOOLEAN,
    locked_until TIMESTAMPTZ,
    reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_lockout RECORD;
BEGIN
    -- Check most recent active lockout
    SELECT * INTO v_lockout
    FROM public.account_lockout_history
    WHERE email = p_email
    AND locked_until > CURRENT_TIMESTAMP
    AND unlocked_at IS NULL
    ORDER BY locked_at DESC
    LIMIT 1;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            true::BOOLEAN,
            v_lockout.locked_until,
            v_lockout.lockout_reason;
    ELSE
        RETURN QUERY SELECT 
            false::BOOLEAN,
            NULL::TIMESTAMPTZ,
            NULL::TEXT;
    END IF;
END;
$$;

-- Cleanup old login attempts (retention: 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.login_attempts
    WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;
-- Location: supabase/migrations/20251222162421_two_factor_authentication_module.sql
-- Schema Analysis: Authentication infrastructure exists via staff_members and roles
-- Integration Type: NEW_MODULE - Adding 2FA security layer
-- Dependencies: auth.users, staff_members

-- ========================
-- 1. TYPES
-- ========================

CREATE TYPE public.mfa_method AS ENUM ('totp', 'email');
CREATE TYPE public.mfa_status AS ENUM ('pending', 'enabled', 'disabled', 'suspended');

-- ========================
-- 2. CORE TABLES
-- ========================

-- Track 2FA enrollment and preferences for users
CREATE TABLE public.user_mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mfa_enabled BOOLEAN DEFAULT false,
    primary_method public.mfa_method,
    backup_method public.mfa_method,
    totp_secret TEXT, -- Encrypted TOTP secret for authenticator apps
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    backup_codes TEXT[], -- Array of encrypted backup codes
    last_verified_at TIMESTAMPTZ,
    verification_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    status public.mfa_status DEFAULT 'disabled'::public.mfa_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Log MFA verification attempts for security monitoring
CREATE TABLE public.mfa_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    method public.mfa_method NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    failure_reason TEXT,
    verification_code_used TEXT, -- Hashed code for audit
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    device_fingerprint TEXT,
    location_data JSONB
);

-- Store temporary MFA enrollment data during setup process
CREATE TABLE public.mfa_enrollment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    method public.mfa_method NOT NULL,
    temp_secret TEXT, -- Temporary secret during enrollment
    qr_code_uri TEXT, -- TOTP QR code URI
    verification_token TEXT, -- Token for email verification
    expires_at TIMESTAMPTZ NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- 3. INDEXES
-- ========================

CREATE INDEX idx_user_mfa_settings_user_id ON public.user_mfa_settings(user_id);
CREATE INDEX idx_user_mfa_settings_status ON public.user_mfa_settings(status) WHERE status = 'enabled'::public.mfa_status;
CREATE INDEX idx_mfa_verification_logs_user_id ON public.mfa_verification_logs(user_id);
CREATE INDEX idx_mfa_verification_logs_attempted_at ON public.mfa_verification_logs(attempted_at DESC);
CREATE INDEX idx_mfa_enrollment_sessions_user_id ON public.mfa_enrollment_sessions(user_id);
CREATE INDEX idx_mfa_enrollment_sessions_expires ON public.mfa_enrollment_sessions(expires_at) WHERE completed = false;

-- ========================
-- 4. FUNCTIONS
-- ========================

-- Function to check if user has MFA enabled
CREATE OR REPLACE FUNCTION public.user_has_mfa_enabled(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_mfa_settings ums
        WHERE ums.user_id = user_uuid 
        AND ums.mfa_enabled = true
        AND ums.status = 'enabled'::public.mfa_status
    )
$$;

-- Function to check if MFA verification is required for admin login
CREATE OR REPLACE FUNCTION public.mfa_required_for_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.staff_members sm
        JOIN public.roles r ON sm.role_id = r.id
        WHERE sm.user_profile_id = auth.uid()
        AND r.name IN ('super_admin', 'admin', 'manager')
        AND EXISTS (
            SELECT 1 FROM public.user_mfa_settings ums
            WHERE ums.user_id = auth.uid()
            AND ums.mfa_enabled = true
        )
    )
$$;

-- Function to log MFA verification attempts
CREATE OR REPLACE FUNCTION public.log_mfa_verification(
    p_user_id UUID,
    p_method public.mfa_method,
    p_success BOOLEAN,
    p_ip_address INET,
    p_user_agent TEXT,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.mfa_verification_logs (
        user_id,
        method,
        success,
        ip_address,
        user_agent,
        failure_reason
    ) VALUES (
        p_user_id,
        p_method,
        p_success,
        p_ip_address,
        p_user_agent,
        p_failure_reason
    )
    RETURNING id INTO v_log_id;
    
    -- Update last verified timestamp if successful
    IF p_success THEN
        UPDATE public.user_mfa_settings
        SET last_verified_at = CURRENT_TIMESTAMP,
            verification_attempts = 0
        WHERE user_id = p_user_id;
    ELSE
        -- Increment failed attempts
        UPDATE public.user_mfa_settings
        SET verification_attempts = verification_attempts + 1
        WHERE user_id = p_user_id;
        
        -- Lock account after 5 failed attempts
        UPDATE public.user_mfa_settings
        SET locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes',
            status = 'suspended'::public.mfa_status
        WHERE user_id = p_user_id
        AND verification_attempts >= 5
        AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP);
    END IF;
    
    RETURN v_log_id;
END;
$$;

-- Function to clean up expired enrollment sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.mfa_enrollment_sessions
    WHERE expires_at < CURRENT_TIMESTAMP
    AND completed = false;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- ========================
-- 5. TRIGGERS
-- ========================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_mfa_settings_updated_at
    BEFORE UPDATE ON public.user_mfa_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ========================
-- 6. RLS POLICIES
-- ========================

ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_enrollment_sessions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own MFA settings
CREATE POLICY "users_manage_own_mfa_settings"
ON public.user_mfa_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all MFA settings for security monitoring
CREATE POLICY "admins_view_all_mfa_settings"
ON public.user_mfa_settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.staff_members sm
        JOIN public.roles r ON sm.role_id = r.id
        WHERE sm.user_profile_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
    )
);

-- Users can view their own verification logs
CREATE POLICY "users_view_own_verification_logs"
ON public.mfa_verification_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all verification logs
CREATE POLICY "admins_view_all_verification_logs"
ON public.mfa_verification_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.staff_members sm
        JOIN public.roles r ON sm.role_id = r.id
        WHERE sm.user_profile_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
    )
);

-- Users can manage their own enrollment sessions
CREATE POLICY "users_manage_own_enrollment_sessions"
ON public.mfa_enrollment_sessions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ========================
-- 7. COMMENTS
-- ========================

COMMENT ON TABLE public.user_mfa_settings IS 'Stores user 2FA preferences and enrollment status';
COMMENT ON TABLE public.mfa_verification_logs IS 'Audit log for all MFA verification attempts';
COMMENT ON TABLE public.mfa_enrollment_sessions IS 'Temporary storage for MFA enrollment process';
COMMENT ON FUNCTION public.user_has_mfa_enabled IS 'Checks if a user has MFA enabled and active';
COMMENT ON FUNCTION public.log_mfa_verification IS 'Logs MFA verification attempts and manages account locking';
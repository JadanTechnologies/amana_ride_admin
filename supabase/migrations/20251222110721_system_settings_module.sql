-- Location: supabase/migrations/20251222110721_system_settings_module.sql
-- Schema Analysis: Existing staff_management RBAC with roles, permissions, audit_logs
-- Integration Type: NEW MODULE - System Settings Management
-- Dependencies: roles, staff_members, audit_logs

-- 1. Create custom types for system settings
CREATE TYPE public.setting_category AS ENUM (
    'general',
    'security', 
    'notification',
    'compliance',
    'branding',
    'api'
);

CREATE TYPE public.notification_channel AS ENUM (
    'email',
    'sms',
    'push',
    'webhook'
);

CREATE TYPE public.compliance_standard AS ENUM (
    'gdpr',
    'hipaa',
    'soc2',
    'iso27001',
    'pci_dss'
);

-- 2. Core system settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category public.setting_category NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    display_name TEXT NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    requires_restart BOOLEAN DEFAULT false,
    validation_rules JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    CONSTRAINT unique_setting_key UNIQUE(category, setting_key)
);

-- 3. Security policies configuration table
CREATE TABLE public.security_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL UNIQUE,
    policy_type TEXT NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    enforcement_level TEXT DEFAULT 'strict',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    last_modified_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL
);

-- 4. Notification preferences table
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preference_name TEXT NOT NULL UNIQUE,
    channel public.notification_channel NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    recipient_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    escalation_rules JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Compliance settings table
CREATE TABLE public.compliance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard public.compliance_standard NOT NULL,
    requirement_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    retention_period_days INTEGER,
    automated_checks JSONB DEFAULT '{}'::jsonb,
    last_audit_date TIMESTAMPTZ,
    next_audit_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_compliance_requirement UNIQUE(standard, requirement_name)
);

-- 6. Branding configuration table
CREATE TABLE public.branding_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_name TEXT NOT NULL UNIQUE,
    element_type TEXT NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    asset_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL
);

-- 7. Settings change history table
CREATE TABLE public.settings_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_type TEXT NOT NULL,
    setting_id UUID NOT NULL,
    previous_value JSONB,
    new_value JSONB NOT NULL,
    change_reason TEXT,
    changed_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    approval_status TEXT DEFAULT 'pending'
);

-- 8. Create indexes for performance
CREATE INDEX idx_system_settings_category ON public.system_settings(category);
CREATE INDEX idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX idx_security_policies_active ON public.security_policies(is_active);
CREATE INDEX idx_notification_prefs_channel ON public.notification_preferences(channel);
CREATE INDEX idx_compliance_standard ON public.compliance_settings(standard);
CREATE INDEX idx_branding_active ON public.branding_settings(is_active);
CREATE INDEX idx_change_history_type ON public.settings_change_history(setting_type);
CREATE INDEX idx_change_history_date ON public.settings_change_history(changed_at DESC);

-- 9. Enable RLS on all tables
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_change_history ENABLE ROW LEVEL SECURITY;

-- 10. Create helper function for admin role check
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.staff_members sm
    JOIN public.roles r ON sm.role_id = r.id
    WHERE sm.user_profile_id = auth.uid()
    AND r.name IN ('super_admin', 'system_administrator')
    AND sm.employment_status = 'active'
)
$$;

-- 11. Create RLS policies - Admin-only access for system settings
CREATE POLICY "super_admin_full_access_system_settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_security_policies"
ON public.security_policies
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_notification_preferences"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_compliance_settings"
ON public.compliance_settings
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_branding_settings"
ON public.branding_settings
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_settings_history"
ON public.settings_change_history
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- 12. Create trigger for updated_at timestamp
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_policies_updated_at
    BEFORE UPDATE ON public.security_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_settings_updated_at
    BEFORE UPDATE ON public.compliance_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branding_settings_updated_at
    BEFORE UPDATE ON public.branding_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Insert sample system settings data
DO $$
DECLARE
    existing_admin_id UUID;
BEGIN
    -- Get existing admin user
    SELECT id INTO existing_admin_id 
    FROM public.staff_members 
    WHERE employment_status = 'active' 
    LIMIT 1;

    -- General Configuration Settings
    INSERT INTO public.system_settings (category, setting_key, setting_value, display_name, description, created_by)
    VALUES
        ('general', 'app_name', '{"value": "Transport Management System"}'::jsonb, 'Application Name', 'Main application display name', existing_admin_id),
        ('general', 'maintenance_mode', '{"enabled": false, "message": "System under maintenance"}'::jsonb, 'Maintenance Mode', 'Enable/disable maintenance mode', existing_admin_id),
        ('general', 'timezone', '{"value": "UTC", "auto_detect": true}'::jsonb, 'System Timezone', 'Default timezone for the system', existing_admin_id);

    -- Security Policy Settings
    INSERT INTO public.security_policies (policy_name, policy_type, configuration, created_by)
    VALUES
        ('Password Policy', 'authentication', '{"min_length": 12, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special": true, "expiry_days": 90}'::jsonb, existing_admin_id),
        ('Session Management', 'authentication', '{"timeout_minutes": 30, "max_concurrent_sessions": 3, "require_reauth_for_sensitive": true}'::jsonb, existing_admin_id),
        ('Two-Factor Authentication', 'authentication', '{"enabled": false, "mandatory_for_roles": ["super_admin"], "methods": ["totp", "sms"]}'::jsonb, existing_admin_id),
        ('Access Control Rules', 'authorization', '{"ip_whitelist": [], "max_failed_attempts": 5, "lockout_duration_minutes": 30}'::jsonb, existing_admin_id);

    -- Notification Preferences
    INSERT INTO public.notification_preferences (preference_name, channel, configuration, recipient_roles)
    VALUES
        ('System Alerts', 'email', '{"template_id": "system_alert", "priority": "high", "retry_attempts": 3}'::jsonb, ARRAY['super_admin']::TEXT[]),
        ('Security Incidents', 'email', '{"template_id": "security_alert", "priority": "critical", "immediate": true}'::jsonb, ARRAY['super_admin', 'security_manager']::TEXT[]),
        ('Compliance Notifications', 'email', '{"template_id": "compliance_alert", "frequency": "daily"}'::jsonb, ARRAY['compliance_officer']::TEXT[]),
        ('User Registration', 'email', '{"template_id": "welcome_email", "delay_minutes": 0}'::jsonb, ARRAY[]::TEXT[]);

    -- Compliance Settings
    INSERT INTO public.compliance_settings (standard, requirement_name, configuration, retention_period_days)
    VALUES
        ('gdpr', 'Data Retention Policy', '{"auto_delete": true, "user_consent_required": true, "data_categories": ["personal", "sensitive"]}'::jsonb, 2555),
        ('gdpr', 'Right to be Forgotten', '{"enabled": true, "processing_time_days": 30, "verification_required": true}'::jsonb, NULL),
        ('soc2', 'Audit Logging', '{"log_all_access": true, "log_data_changes": true, "retention_years": 7}'::jsonb, 2555),
        ('iso27001', 'Access Review', '{"review_frequency_days": 90, "automated_revocation": true}'::jsonb, NULL);

    -- Branding Settings
    INSERT INTO public.branding_settings (element_name, element_type, configuration)
    VALUES
        ('Primary Logo', 'logo', '{"width": 200, "height": 60, "format": "svg", "alt_text": "Company Logo"}'::jsonb),
        ('Color Scheme', 'theme', '{"primary": "#3B82F6", "secondary": "#10B981", "accent": "#F59E0B", "background": "#FFFFFF"}'::jsonb),
        ('Email Template', 'template', '{"header_color": "#3B82F6", "footer_text": "© 2025 All rights reserved", "show_social": true}'::jsonb),
        ('Custom Domain', 'domain', '{"primary_domain": "app.example.com", "ssl_enabled": true, "cdn_enabled": false}'::jsonb);

    -- Settings Change History
    INSERT INTO public.settings_change_history (setting_type, setting_id, new_value, change_reason, changed_by, approval_status)
    SELECT 
        'system_settings',
        id,
        setting_value,
        'Initial configuration',
        created_by,
        'approved'
    FROM public.system_settings
    WHERE created_by IS NOT NULL
    LIMIT 3;

END $$;

-- 14. Grant necessary permissions
COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings managed by super administrators';
COMMENT ON TABLE public.security_policies IS 'Security policy definitions and configurations';
COMMENT ON TABLE public.notification_preferences IS 'Notification channel and delivery preferences';
COMMENT ON TABLE public.compliance_settings IS 'Compliance requirements and audit configurations';
COMMENT ON TABLE public.branding_settings IS 'White-label branding and visual customization settings';
COMMENT ON TABLE public.settings_change_history IS 'Audit trail for all settings modifications';
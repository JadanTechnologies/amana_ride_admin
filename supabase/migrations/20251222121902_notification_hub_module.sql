-- Location: supabase/migrations/20251222121902_notification_hub_module.sql
-- Schema Analysis: Building upon existing staff_members, roles, notification_preferences
-- Integration Type: Addition - New notification records table
-- Dependencies: staff_members, roles (existing tables)

-- 1. Create ENUM types for notification system
CREATE TYPE public.notification_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE public.notification_category AS ENUM ('system', 'operations', 'security', 'admin_messages');
CREATE TYPE public.notification_status AS ENUM ('unread', 'read', 'acknowledged', 'resolved');

-- 2. Create system_notifications table
CREATE TABLE public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority public.notification_priority NOT NULL DEFAULT 'medium'::public.notification_priority,
    category public.notification_category NOT NULL,
    status public.notification_status NOT NULL DEFAULT 'unread'::public.notification_status,
    source_system TEXT,
    created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes for performance
CREATE INDEX idx_system_notifications_priority ON public.system_notifications(priority);
CREATE INDEX idx_system_notifications_category ON public.system_notifications(category);
CREATE INDEX idx_system_notifications_status ON public.system_notifications(status);
CREATE INDEX idx_system_notifications_assigned_to ON public.system_notifications(assigned_to);
CREATE INDEX idx_system_notifications_created_at ON public.system_notifications(created_at DESC);
CREATE INDEX idx_system_notifications_priority_status ON public.system_notifications(priority, status);

-- 4. Enable RLS
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies using existing is_super_admin function
CREATE POLICY "super_admin_full_access_system_notifications"
ON public.system_notifications
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "staff_view_assigned_notifications"
ON public.system_notifications
FOR SELECT
TO authenticated
USING (
    assigned_to IN (
        SELECT id FROM public.staff_members 
        WHERE user_profile_id = auth.uid()
    )
);

-- 6. Create trigger for updated_at
CREATE TRIGGER update_system_notifications_updated_at
    BEFORE UPDATE ON public.system_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create mock data
DO $$
DECLARE
    super_admin_staff_id UUID;
    admin_staff_id UUID;
BEGIN
    -- Get existing staff member IDs
    SELECT sm.id INTO super_admin_staff_id 
    FROM public.staff_members sm
    JOIN public.roles r ON sm.role_id = r.id
    WHERE r.name = 'super_admin'
    LIMIT 1;

    SELECT sm.id INTO admin_staff_id
    FROM public.staff_members sm
    JOIN public.roles r ON sm.role_id = r.id
    WHERE r.name = 'admin'
    LIMIT 1;

    -- Insert sample notifications
    INSERT INTO public.system_notifications (
        title, description, priority, category, status, 
        source_system, created_by, assigned_to
    ) VALUES
        (
            'Critical Database Connection Failure',
            'Primary database cluster experiencing connectivity issues. Immediate attention required to prevent service disruption.',
            'critical'::public.notification_priority,
            'system'::public.notification_category,
            'unread'::public.notification_status,
            'Database Monitor',
            super_admin_staff_id,
            super_admin_staff_id
        ),
        (
            'High CPU Usage Detected',
            'Application server CPU usage exceeded 85% threshold for sustained period. Consider scaling resources.',
            'high'::public.notification_priority,
            'operations'::public.notification_category,
            'acknowledged'::public.notification_status,
            'Performance Monitor',
            super_admin_staff_id,
            admin_staff_id
        ),
        (
            'Unusual Login Activity Detected',
            'Multiple failed login attempts from suspicious IP addresses. Security review recommended.',
            'high'::public.notification_priority,
            'security'::public.notification_category,
            'unread'::public.notification_status,
            'Security System',
            super_admin_staff_id,
            super_admin_staff_id
        ),
        (
            'Scheduled Maintenance Window',
            'System maintenance scheduled for 2025-12-25 02:00 UTC. Estimated downtime: 2 hours.',
            'medium'::public.notification_priority,
            'admin_messages'::public.notification_category,
            'read'::public.notification_status,
            'Admin Console',
            super_admin_staff_id,
            NULL
        ),
        (
            'Backup Completion Successful',
            'Daily automated backup completed successfully at 2025-12-22 03:00 UTC. All data secured.',
            'low'::public.notification_priority,
            'operations'::public.notification_category,
            'resolved'::public.notification_status,
            'Backup System',
            super_admin_staff_id,
            admin_staff_id
        ),
        (
            'API Rate Limit Exceeded',
            'External API integration hit rate limit threshold. Service degradation possible for third-party features.',
            'medium'::public.notification_priority,
            'operations'::public.notification_category,
            'unread'::public.notification_status,
            'API Gateway',
            super_admin_staff_id,
            admin_staff_id
        ),
        (
            'Security Certificate Expiring Soon',
            'SSL certificate for primary domain expires in 14 days. Renewal required to prevent service interruption.',
            'high'::public.notification_priority,
            'security'::public.notification_category,
            'unread'::public.notification_status,
            'Certificate Monitor',
            super_admin_staff_id,
            super_admin_staff_id
        );
END $$;
-- Location: supabase/migrations/20251222152545_incident_playbook_management.sql
-- Schema Analysis: Existing incident management (escalation_workflows, remediation_actions, workflow_executions)
-- Integration Type: Extension - Add playbook template management
-- Dependencies: staff_members, escalation_workflows, remediation_actions

-- ==========================================
-- 1. ENUMS & TYPES
-- ==========================================

CREATE TYPE public.playbook_category AS ENUM (
    'security',
    'technical',
    'operational',
    'compliance'
);

CREATE TYPE public.playbook_status AS ENUM (
    'active',
    'draft',
    'archived',
    'under_review'
);

CREATE TYPE public.approval_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'revision_requested'
);

-- ==========================================
-- 2. CORE TABLES
-- ==========================================

-- Incident Playbooks - Reusable templates for standardized emergency procedures
CREATE TABLE public.incident_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_name TEXT NOT NULL UNIQUE,
    playbook_category public.playbook_category NOT NULL,
    incident_type public.incident_type NOT NULL,
    severity_level public.severity_level NOT NULL,
    description TEXT,
    status public.playbook_status DEFAULT 'draft'::public.playbook_status,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    effectiveness_score NUMERIC(3,2),
    estimated_resolution_time_minutes INTEGER,
    compliance_requirements JSONB DEFAULT '[]'::jsonb,
    tags TEXT[]
);

-- Task Templates - Predefined task checklists within playbooks
CREATE TABLE public.playbook_task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES public.incident_playbooks(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_description TEXT,
    task_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    estimated_duration_minutes INTEGER,
    assigned_role TEXT,
    prerequisite_tasks JSONB DEFAULT '[]'::jsonb,
    validation_criteria JSONB DEFAULT '[]'::jsonb,
    automation_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Escalation Path Templates - Predefined escalation workflows
CREATE TABLE public.playbook_escalation_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES public.incident_playbooks(id) ON DELETE CASCADE,
    escalation_level INTEGER NOT NULL,
    trigger_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    escalation_delay_minutes INTEGER DEFAULT 15,
    escalation_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    notification_channels public.notification_channel[] DEFAULT ARRAY['email']::public.notification_channel[],
    escalation_actions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Communication Scripts - Predefined messages and templates
CREATE TABLE public.playbook_communication_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES public.incident_playbooks(id) ON DELETE CASCADE,
    script_name TEXT NOT NULL,
    script_type TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    message_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    delivery_channels public.notification_channel[] DEFAULT ARRAY['email']::public.notification_channel[],
    send_timing TEXT,
    is_automated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Playbook Activations - Track playbook usage and outcomes
CREATE TABLE public.playbook_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES public.incident_playbooks(id) ON DELETE CASCADE,
    incident_id UUID,
    activated_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    activated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    resolution_outcome TEXT,
    actual_resolution_time_minutes INTEGER,
    tasks_completed INTEGER DEFAULT 0,
    tasks_total INTEGER,
    effectiveness_rating NUMERIC(3,2),
    lessons_learned TEXT,
    improvement_suggestions TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Playbook Versions - Track playbook changes over time
CREATE TABLE public.playbook_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES public.incident_playbooks(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changes_summary TEXT NOT NULL,
    changed_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    approval_status public.approval_status DEFAULT 'pending'::public.approval_status,
    approval_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMPTZ,
    playbook_snapshot JSONB NOT NULL
);

-- ==========================================
-- 3. INDEXES
-- ==========================================

CREATE INDEX idx_incident_playbooks_category ON public.incident_playbooks(playbook_category);
CREATE INDEX idx_incident_playbooks_status ON public.incident_playbooks(status);
CREATE INDEX idx_incident_playbooks_incident_type ON public.incident_playbooks(incident_type);
CREATE INDEX idx_incident_playbooks_severity ON public.incident_playbooks(severity_level);
CREATE INDEX idx_incident_playbooks_usage ON public.incident_playbooks(usage_count DESC);
CREATE INDEX idx_incident_playbooks_effectiveness ON public.incident_playbooks(effectiveness_score DESC);

CREATE INDEX idx_playbook_tasks_playbook ON public.playbook_task_templates(playbook_id);
CREATE INDEX idx_playbook_tasks_order ON public.playbook_task_templates(playbook_id, task_order);

CREATE INDEX idx_playbook_escalations_playbook ON public.playbook_escalation_paths(playbook_id);
CREATE INDEX idx_playbook_escalations_level ON public.playbook_escalation_paths(playbook_id, escalation_level);

CREATE INDEX idx_playbook_scripts_playbook ON public.playbook_communication_scripts(playbook_id);
CREATE INDEX idx_playbook_scripts_type ON public.playbook_communication_scripts(script_type);

CREATE INDEX idx_playbook_activations_playbook ON public.playbook_activations(playbook_id);
CREATE INDEX idx_playbook_activations_date ON public.playbook_activations(activated_at DESC);
CREATE INDEX idx_playbook_activations_outcome ON public.playbook_activations(resolution_outcome);

CREATE INDEX idx_playbook_versions_playbook ON public.playbook_versions(playbook_id);
CREATE INDEX idx_playbook_versions_number ON public.playbook_versions(playbook_id, version_number DESC);
CREATE INDEX idx_playbook_versions_status ON public.playbook_versions(approval_status);

-- ==========================================
-- 4. FUNCTIONS
-- ==========================================

-- Function to update playbook version
CREATE OR REPLACE FUNCTION public.increment_playbook_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.version = COALESCE(
        (SELECT MAX(version) + 1 FROM public.incident_playbooks WHERE playbook_name = NEW.playbook_name),
        1
    );
    RETURN NEW;
END;
$$;

-- Function to update usage metrics
CREATE OR REPLACE FUNCTION public.update_playbook_usage_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.incident_playbooks
    SET 
        usage_count = usage_count + 1,
        last_used_at = NEW.activated_at
    WHERE id = NEW.playbook_id;
    RETURN NEW;
END;
$$;

-- Function to calculate effectiveness score
CREATE OR REPLACE FUNCTION public.calculate_playbook_effectiveness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    avg_rating NUMERIC;
BEGIN
    IF NEW.completed_at IS NOT NULL THEN
        SELECT AVG(effectiveness_rating)
        INTO avg_rating
        FROM public.playbook_activations
        WHERE playbook_id = NEW.playbook_id
        AND effectiveness_rating IS NOT NULL;
        
        UPDATE public.incident_playbooks
        SET effectiveness_score = ROUND(avg_rating, 2)
        WHERE id = NEW.playbook_id;
    END IF;
    RETURN NEW;
END;
$$;

-- ==========================================
-- 5. RLS POLICIES
-- ==========================================

ALTER TABLE public.incident_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_escalation_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_communication_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_versions ENABLE ROW LEVEL SECURITY;

-- Super admin full access to all playbook tables
CREATE POLICY "super_admin_full_access_playbooks"
ON public.incident_playbooks
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_playbook_tasks"
ON public.playbook_task_templates
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_playbook_escalations"
ON public.playbook_escalation_paths
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_playbook_scripts"
ON public.playbook_communication_scripts
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_playbook_activations"
ON public.playbook_activations
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_playbook_versions"
ON public.playbook_versions
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ==========================================
-- 6. TRIGGERS
-- ==========================================

CREATE TRIGGER update_incident_playbooks_updated_at
BEFORE UPDATE ON public.incident_playbooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_task_templates_updated_at
BEFORE UPDATE ON public.playbook_task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_escalation_paths_updated_at
BEFORE UPDATE ON public.playbook_escalation_paths
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_communication_scripts_updated_at
BEFORE UPDATE ON public.playbook_communication_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_activations_updated_at
BEFORE UPDATE ON public.playbook_activations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_playbook_usage
AFTER INSERT ON public.playbook_activations
FOR EACH ROW
EXECUTE FUNCTION public.update_playbook_usage_metrics();

CREATE TRIGGER trigger_calculate_playbook_effectiveness
AFTER UPDATE ON public.playbook_activations
FOR EACH ROW
WHEN (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL)
EXECUTE FUNCTION public.calculate_playbook_effectiveness();

-- ==========================================
-- 7. MOCK DATA
-- ==========================================

DO $$
DECLARE
    security_playbook_id UUID := gen_random_uuid();
    technical_playbook_id UUID := gen_random_uuid();
    operational_playbook_id UUID := gen_random_uuid();
BEGIN
    -- Insert incident playbooks
    INSERT INTO public.incident_playbooks (
        id, playbook_name, playbook_category, incident_type, severity_level,
        description, status, version, usage_count, effectiveness_score,
        estimated_resolution_time_minutes, compliance_requirements, tags
    ) VALUES
    (
        security_playbook_id,
        'Data Breach Response Protocol',
        'security'::public.playbook_category,
        'data_integrity_issue'::public.incident_type,
        'critical'::public.severity_level,
        'Comprehensive playbook for responding to potential data breach incidents with immediate containment and notification procedures',
        'active'::public.playbook_status,
        2,
        47,
        4.6,
        90,
        '["GDPR Article 33", "HIPAA Breach Notification Rule", "SOC2 Incident Response"]'::jsonb,
        ARRAY['security', 'compliance', 'data-breach', 'notification']
    ),
    (
        technical_playbook_id,
        'Critical System Outage Recovery',
        'technical'::public.playbook_category,
        'connection_disruption'::public.incident_type,
        'high'::public.severity_level,
        'Step-by-step recovery procedures for critical system outages including failover and rollback strategies',
        'active'::public.playbook_status,
        3,
        128,
        4.4,
        45,
        '["ISO 27001", "ITIL Incident Management"]'::jsonb,
        ARRAY['outage', 'recovery', 'failover', 'business-continuity']
    ),
    (
        operational_playbook_id,
        'Performance Degradation Investigation',
        'operational'::public.playbook_category,
        'performance_degradation'::public.incident_type,
        'medium'::public.severity_level,
        'Systematic approach to diagnosing and resolving performance issues with monitoring and optimization steps',
        'active'::public.playbook_status,
        1,
        89,
        4.2,
        60,
        '["SLA Compliance", "Performance Standards"]'::jsonb,
        ARRAY['performance', 'monitoring', 'optimization']
    );

    -- Insert task templates for Data Breach Response
    INSERT INTO public.playbook_task_templates (
        playbook_id, task_name, task_description, task_order, is_required,
        estimated_duration_minutes, assigned_role, prerequisite_tasks, validation_criteria
    ) VALUES
    (
        security_playbook_id,
        'Immediate Containment',
        'Isolate affected systems and prevent further data exposure',
        1,
        true,
        15,
        'Security Team Lead',
        '[]'::jsonb,
        '[{"criterion": "Affected systems isolated", "validation_method": "Network logs review"}]'::jsonb
    ),
    (
        security_playbook_id,
        'Impact Assessment',
        'Determine scope of breach and affected data types',
        2,
        true,
        30,
        'Data Privacy Officer',
        '[{"task_id": 1, "task_name": "Immediate Containment"}]'::jsonb,
        '[{"criterion": "Data categories identified", "validation_method": "Database audit"}]'::jsonb
    ),
    (
        security_playbook_id,
        'Regulatory Notification',
        'Notify relevant authorities within required timeframe',
        3,
        true,
        45,
        'Legal Compliance Officer',
        '[{"task_id": 2, "task_name": "Impact Assessment"}]'::jsonb,
        '[{"criterion": "Authorities notified", "validation_method": "Notification confirmation receipts"}]'::jsonb
    );

    -- Insert task templates for System Outage Recovery
    INSERT INTO public.playbook_task_templates (
        playbook_id, task_name, task_description, task_order, is_required,
        estimated_duration_minutes, assigned_role, prerequisite_tasks, validation_criteria
    ) VALUES
    (
        technical_playbook_id,
        'Incident Declaration',
        'Formally declare system outage and initiate response team',
        1,
        true,
        5,
        'On-Call Engineer',
        '[]'::jsonb,
        '[{"criterion": "Incident ticket created", "validation_method": "Ticket system confirmation"}]'::jsonb
    ),
    (
        technical_playbook_id,
        'Failover Execution',
        'Switch to secondary systems or backup infrastructure',
        2,
        true,
        20,
        'Infrastructure Team',
        '[{"task_id": 1, "task_name": "Incident Declaration"}]'::jsonb,
        '[{"criterion": "Secondary systems operational", "validation_method": "Health check passed"}]'::jsonb
    );

    -- Insert escalation paths for Data Breach Response
    INSERT INTO public.playbook_escalation_paths (
        playbook_id, escalation_level, trigger_conditions, escalation_delay_minutes,
        escalation_recipients, notification_channels, escalation_actions
    ) VALUES
    (
        security_playbook_id,
        1,
        '{"condition": "Initial containment not completed within 15 minutes"}'::jsonb,
        15,
        '[{"role": "Security Team Lead", "contact": "security-lead@company.com"}]'::jsonb,
        ARRAY['email', 'sms']::public.notification_channel[],
        '[{"action": "Escalate to security leadership", "automated": true}]'::jsonb
    ),
    (
        security_playbook_id,
        2,
        '{"condition": "Breach affects more than 1000 records OR regulatory deadline approaching"}'::jsonb,
        30,
        '[{"role": "CISO", "contact": "ciso@company.com"}, {"role": "Legal Counsel", "contact": "legal@company.com"}]'::jsonb,
        ARRAY['email', 'sms', 'push']::public.notification_channel[],
        '[{"action": "Activate crisis management team", "automated": true}, {"action": "Prepare executive briefing", "automated": false}]'::jsonb
    );

    -- Insert communication scripts for Data Breach Response
    INSERT INTO public.playbook_communication_scripts (
        playbook_id, script_name, script_type, target_audience, message_template,
        variables, delivery_channels, send_timing, is_automated
    ) VALUES
    (
        security_playbook_id,
        'Initial Breach Notification',
        'email',
        'Affected Users',
        'Dear {{user_name}},\n\nWe are writing to inform you of a data security incident that may have affected your personal information. On {{incident_date}}, we discovered {{breach_description}}.\n\nAffected data: {{affected_data_types}}\nSteps we are taking: {{remediation_steps}}\nRecommended actions: {{user_actions}}\n\nFor questions: {{support_contact}}',
        '[{"name": "user_name", "type": "text"}, {"name": "incident_date", "type": "date"}, {"name": "breach_description", "type": "text"}]'::jsonb,
        ARRAY['email']::public.notification_channel[],
        'Within 72 hours of breach discovery',
        false
    ),
    (
        security_playbook_id,
        'Internal Team Alert',
        'notification',
        'Response Team',
        'CRITICAL: Data breach incident {{incident_id}} requires immediate attention. Severity: {{severity}}. Estimated affected records: {{record_count}}. Report to war room immediately.',
        '[{"name": "incident_id", "type": "text"}, {"name": "severity", "type": "text"}, {"name": "record_count", "type": "number"}]'::jsonb,
        ARRAY['email', 'sms', 'push']::public.notification_channel[],
        'Immediate upon detection',
        true
    );

    -- Insert playbook activations (historical usage)
    INSERT INTO public.playbook_activations (
        playbook_id, activated_at, completed_at, resolution_outcome,
        actual_resolution_time_minutes, tasks_completed, tasks_total,
        effectiveness_rating, lessons_learned
    ) VALUES
    (
        security_playbook_id,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '15 days' + INTERVAL '95 minutes',
        'Successfully contained breach, notified authorities within 72-hour window',
        95,
        3,
        3,
        4.5,
        'Response was effective. Consider pre-drafting notification templates to save time.'
    ),
    (
        technical_playbook_id,
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '7 days' + INTERVAL '42 minutes',
        'Successfully failed over to secondary systems with minimal downtime',
        42,
        2,
        2,
        4.8,
        'Failover executed smoothly. Automated health checks performed as expected.'
    );

    -- Insert version history
    INSERT INTO public.playbook_versions (
        playbook_id, version_number, changes_summary, playbook_snapshot,
        approval_status, created_at
    ) VALUES
    (
        security_playbook_id,
        1,
        'Initial playbook version with basic response procedures',
        '{"version": 1, "tasks": 2, "escalation_paths": 1}'::jsonb,
        'approved'::public.approval_status,
        NOW() - INTERVAL '90 days'
    ),
    (
        security_playbook_id,
        2,
        'Added regulatory notification task and enhanced escalation matrix',
        '{"version": 2, "tasks": 3, "escalation_paths": 2, "changes": ["Added regulatory notification task", "Enhanced escalation criteria"]}'::jsonb,
        'approved'::public.approval_status,
        NOW() - INTERVAL '30 days'
    );

END $$;

-- ==========================================
-- 8. COMMENTS
-- ==========================================

COMMENT ON TABLE public.incident_playbooks IS 'Reusable incident response playbooks with predefined procedures, escalation paths, and communication scripts';
COMMENT ON TABLE public.playbook_task_templates IS 'Task checklists within playbooks defining step-by-step response procedures';
COMMENT ON TABLE public.playbook_escalation_paths IS 'Predefined escalation workflows with triggers and notification rules';
COMMENT ON TABLE public.playbook_communication_scripts IS 'Template messages and communication protocols for incident response';
COMMENT ON TABLE public.playbook_activations IS 'Historical record of playbook usage and effectiveness tracking';
COMMENT ON TABLE public.playbook_versions IS 'Version control and approval workflow for playbook changes';
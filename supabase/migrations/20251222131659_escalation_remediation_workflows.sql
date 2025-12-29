-- Location: supabase/migrations/20251222131659_escalation_remediation_workflows.sql
-- Schema Analysis: Existing notification_rules, sync_retry_queue, conflict_resolution_policies, system_notifications
-- Integration Type: Extension - Adding escalation workflows and remediation actions
-- Dependencies: staff_members, system_notifications, notification_rules, sync_retry_queue

-- ============================================================
-- AUTOMATED ESCALATION & REMEDIATION WORKFLOWS MODULE
-- ============================================================
-- Purpose: Comprehensive incident response automation with threshold monitoring,
-- alert routing policies, and self-healing capabilities for sync failures
-- and connection disruptions.
-- ============================================================

-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE public.workflow_status AS ENUM (
    'active',
    'paused', 
    'testing',
    'disabled'
);

CREATE TYPE public.incident_type AS ENUM (
    'sync_failure',
    'connection_disruption',
    'performance_degradation',
    'data_integrity_issue',
    'authentication_failure',
    'rate_limit_exceeded'
);

CREATE TYPE public.severity_level AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);

CREATE TYPE public.escalation_action_type AS ENUM (
    'notify',
    'auto_retry',
    'failover',
    'rollback',
    'alert_team',
    'trigger_webhook',
    'execute_script',
    'manual_intervention'
);

CREATE TYPE public.remediation_status AS ENUM (
    'pending',
    'in_progress',
    'succeeded',
    'failed',
    'requires_manual_intervention'
);

-- 2. CORE TABLES
-- ============================================================

-- Escalation Workflows Configuration
CREATE TABLE public.escalation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL UNIQUE,
    description TEXT,
    incident_type public.incident_type NOT NULL,
    severity_level public.severity_level NOT NULL,
    status public.workflow_status DEFAULT 'active'::public.workflow_status,
    
    -- Threshold Configuration
    threshold_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"error_count": 5, "time_window_minutes": 10, "failure_rate_percent": 50}
    
    -- Escalation Path
    escalation_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [{"step": 1, "delay_minutes": 5, "actions": ["notify_team"]}, {"step": 2, "delay_minutes": 15, "actions": ["alert_management"]}]
    
    -- Time-based Rules
    cooldown_minutes INTEGER DEFAULT 30,
    max_escalations_per_hour INTEGER DEFAULT 10,
    
    -- Effectiveness Tracking
    triggered_count INTEGER DEFAULT 0,
    successful_resolutions INTEGER DEFAULT 0,
    failed_resolutions INTEGER DEFAULT 0,
    average_resolution_time_minutes NUMERIC(10,2),
    
    -- Metadata
    created_by UUID REFERENCES public.staff_members(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMPTZ
);

-- Remediation Actions Configuration
CREATE TABLE public.remediation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name TEXT NOT NULL UNIQUE,
    description TEXT,
    action_type public.escalation_action_type NOT NULL,
    incident_type public.incident_type NOT NULL,
    
    -- Action Configuration
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"retry_attempts": 3, "backoff_multiplier": 2, "timeout_seconds": 30}
    
    -- Conditions
    execution_conditions JSONB DEFAULT '{}'::jsonb,
    -- Example: {"min_severity": "high", "during_business_hours": true}
    
    -- Recovery Validation
    validation_steps JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"check": "connection_test"}, {"check": "data_consistency"}]
    
    rollback_config JSONB DEFAULT '{}'::jsonb,
    
    -- Effectiveness Metrics
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_execution_time_seconds NUMERIC(10,2),
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.staff_members(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Execution Logs
CREATE TABLE public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.escalation_workflows(id) ON DELETE CASCADE,
    
    -- Trigger Information
    triggered_by_incident_id UUID,
    incident_type public.incident_type NOT NULL,
    severity_level public.severity_level NOT NULL,
    trigger_conditions JSONB,
    
    -- Execution Details
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER,
    status public.remediation_status DEFAULT 'pending'::public.remediation_status,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Results
    actions_executed JSONB DEFAULT '[]'::jsonb,
    resolution_outcome TEXT,
    error_details TEXT,
    
    -- Manual Intervention
    requires_manual_intervention BOOLEAN DEFAULT false,
    assigned_to UUID REFERENCES public.staff_members(id),
    resolved_by UUID REFERENCES public.staff_members(id),
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Remediation Execution Logs
CREATE TABLE public.remediation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    remediation_action_id UUID REFERENCES public.remediation_actions(id) ON DELETE CASCADE,
    
    -- Execution Context
    execution_step INTEGER,
    incident_context JSONB,
    
    -- Status
    status public.remediation_status DEFAULT 'pending'::public.remediation_status,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    execution_time_seconds INTEGER,
    
    -- Results
    action_output JSONB,
    validation_results JSONB,
    success BOOLEAN,
    error_message TEXT,
    
    -- Retry Information
    retry_attempt INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Alert Routing Policies
CREATE TABLE public.alert_routing_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Routing Conditions
    incident_types public.incident_type[] NOT NULL,
    severity_levels public.severity_level[] NOT NULL,
    
    -- Routing Configuration
    primary_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [{"type": "role", "value": "system_admin"}, {"type": "user", "value": "uuid"}]
    
    escalation_recipients JSONB DEFAULT '[]'::jsonb,
    escalation_delay_minutes INTEGER DEFAULT 15,
    
    -- Channels
    notification_channels TEXT[] DEFAULT ARRAY['email']::TEXT[],
    
    -- Schedule
    active_hours JSONB,
    -- Example: {"start": "09:00", "end": "17:00", "timezone": "UTC", "days": ["mon", "tue", "wed", "thu", "fri"]}
    
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    created_by UUID REFERENCES public.staff_members(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Policy Effectiveness Tracking
CREATE TABLE public.policy_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.escalation_workflows(id) ON DELETE CASCADE,
    
    -- Time Period
    metric_date DATE NOT NULL,
    metric_hour INTEGER,
    
    -- Execution Metrics
    total_triggers INTEGER DEFAULT 0,
    successful_resolutions INTEGER DEFAULT 0,
    failed_resolutions INTEGER DEFAULT 0,
    manual_interventions INTEGER DEFAULT 0,
    
    -- Timing Metrics
    average_resolution_time_minutes NUMERIC(10,2),
    median_resolution_time_minutes NUMERIC(10,2),
    fastest_resolution_minutes NUMERIC(10,2),
    slowest_resolution_minutes NUMERIC(10,2),
    
    -- Effectiveness Score
    effectiveness_score NUMERIC(5,2),
    -- Calculated as: (successful_resolutions / total_triggers) * 100
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(workflow_id, metric_date, metric_hour)
);

-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_escalation_workflows_status ON public.escalation_workflows(status);
CREATE INDEX idx_escalation_workflows_incident_type ON public.escalation_workflows(incident_type);
CREATE INDEX idx_escalation_workflows_severity ON public.escalation_workflows(severity_level);
CREATE INDEX idx_escalation_workflows_triggered ON public.escalation_workflows(last_triggered_at);

CREATE INDEX idx_remediation_actions_type ON public.remediation_actions(action_type);
CREATE INDEX idx_remediation_actions_incident ON public.remediation_actions(incident_type);
CREATE INDEX idx_remediation_actions_active ON public.remediation_actions(is_active);

CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_started ON public.workflow_executions(started_at);
CREATE INDEX idx_workflow_executions_incident ON public.workflow_executions(incident_type);

CREATE INDEX idx_remediation_executions_workflow ON public.remediation_executions(workflow_execution_id);
CREATE INDEX idx_remediation_executions_action ON public.remediation_executions(remediation_action_id);
CREATE INDEX idx_remediation_executions_status ON public.remediation_executions(status);

CREATE INDEX idx_alert_routing_active ON public.alert_routing_policies(is_active);
CREATE INDEX idx_alert_routing_priority ON public.alert_routing_policies(priority);

CREATE INDEX idx_policy_metrics_workflow ON public.policy_performance_metrics(workflow_id);
CREATE INDEX idx_policy_metrics_date ON public.policy_performance_metrics(metric_date);

-- 4. FUNCTIONS
-- ============================================================

-- Update workflow triggered count and timestamp
CREATE OR REPLACE FUNCTION public.update_workflow_triggered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    UPDATE public.escalation_workflows
    SET 
        triggered_count = triggered_count + 1,
        last_triggered_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.workflow_id;
    
    RETURN NEW;
END;
$func$;

-- Calculate workflow effectiveness
CREATE OR REPLACE FUNCTION public.calculate_workflow_effectiveness(workflow_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    total_executions INTEGER;
    successful_executions INTEGER;
    effectiveness_score NUMERIC(5,2);
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'succeeded'::public.remediation_status)
    INTO total_executions, successful_executions
    FROM public.workflow_executions
    WHERE workflow_id = workflow_uuid;
    
    IF total_executions = 0 THEN
        RETURN 0;
    END IF;
    
    effectiveness_score := (successful_executions::NUMERIC / total_executions::NUMERIC) * 100;
    
    RETURN effectiveness_score;
END;
$func$;

-- Update remediation action metrics
CREATE OR REPLACE FUNCTION public.update_remediation_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    IF NEW.status = 'succeeded'::public.remediation_status AND OLD.status != 'succeeded'::public.remediation_status THEN
        UPDATE public.remediation_actions
        SET 
            success_count = success_count + 1,
            execution_count = execution_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.remediation_action_id;
    ELSIF NEW.status = 'failed'::public.remediation_status AND OLD.status != 'failed'::public.remediation_status THEN
        UPDATE public.remediation_actions
        SET 
            failure_count = failure_count + 1,
            execution_count = execution_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.remediation_action_id;
    END IF;
    
    RETURN NEW;
END;
$func$;

-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.escalation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remediation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_routing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Super admin full access to all tables
CREATE POLICY "super_admin_full_access_escalation_workflows"
ON public.escalation_workflows
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_remediation_actions"
ON public.remediation_actions
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_workflow_executions"
ON public.workflow_executions
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_remediation_executions"
ON public.remediation_executions
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_alert_routing"
ON public.alert_routing_policies
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_full_access_policy_metrics"
ON public.policy_performance_metrics
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- 6. TRIGGERS
-- ============================================================

CREATE TRIGGER trigger_workflow_execution_created
    AFTER INSERT ON public.workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workflow_triggered();

CREATE TRIGGER trigger_remediation_execution_updated
    AFTER UPDATE ON public.remediation_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_remediation_metrics();

CREATE TRIGGER update_escalation_workflows_updated_at
    BEFORE UPDATE ON public.escalation_workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_remediation_actions_updated_at
    BEFORE UPDATE ON public.remediation_actions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_executions_updated_at
    BEFORE UPDATE ON public.workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_remediation_executions_updated_at
    BEFORE UPDATE ON public.remediation_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alert_routing_policies_updated_at
    BEFORE UPDATE ON public.alert_routing_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7. MOCK DATA
-- ============================================================

DO $$
DECLARE
    workflow1_id UUID := gen_random_uuid();
    workflow2_id UUID := gen_random_uuid();
    action1_id UUID := gen_random_uuid();
    action2_id UUID := gen_random_uuid();
    action3_id UUID := gen_random_uuid();
    execution1_id UUID := gen_random_uuid();
BEGIN
    -- Sample Escalation Workflows
    INSERT INTO public.escalation_workflows (
        id, workflow_name, description, incident_type, severity_level, status,
        threshold_config, escalation_steps, cooldown_minutes, max_escalations_per_hour,
        triggered_count, successful_resolutions, average_resolution_time_minutes
    ) VALUES
    (
        workflow1_id,
        'Critical Sync Failure Response',
        'Automated response workflow for critical sync failures with multi-step escalation',
        'sync_failure'::public.incident_type,
        'critical'::public.severity_level,
        'active'::public.workflow_status,
        '{"error_count": 3, "time_window_minutes": 5, "failure_rate_percent": 75}'::jsonb,
        '[
            {"step": 1, "delay_minutes": 0, "actions": ["auto_retry", "notify"]},
            {"step": 2, "delay_minutes": 5, "actions": ["failover", "alert_team"]},
            {"step": 3, "delay_minutes": 15, "actions": ["manual_intervention"]}
        ]'::jsonb,
        30,
        5,
        47,
        39,
        12.5
    ),
    (
        workflow2_id,
        'Connection Disruption Recovery',
        'Handles connection disruptions with automatic failover and retry mechanisms',
        'connection_disruption'::public.incident_type,
        'high'::public.severity_level,
        'active'::public.workflow_status,
        '{"connection_timeout_seconds": 30, "consecutive_failures": 3}'::jsonb,
        '[
            {"step": 1, "delay_minutes": 0, "actions": ["auto_retry"]},
            {"step": 2, "delay_minutes": 3, "actions": ["failover", "notify"]},
            {"step": 3, "delay_minutes": 10, "actions": ["alert_team"]}
        ]'::jsonb,
        20,
        8,
        128,
        115,
        8.7
    );

    -- Sample Remediation Actions
    INSERT INTO public.remediation_actions (
        id, action_name, description, action_type, incident_type,
        action_config, validation_steps, execution_count, success_count,
        average_execution_time_seconds, is_active
    ) VALUES
    (
        action1_id,
        'Exponential Backoff Retry',
        'Retries failed operations with exponential backoff strategy',
        'auto_retry'::public.escalation_action_type,
        'sync_failure'::public.incident_type,
        '{"max_attempts": 5, "initial_delay_ms": 1000, "backoff_multiplier": 2, "max_delay_ms": 30000}'::jsonb,
        '[{"check": "connection_test"}, {"check": "data_integrity"}]'::jsonb,
        156,
        142,
        4.2,
        true
    ),
    (
        action2_id,
        'Database Failover',
        'Switches to secondary database instance when primary fails',
        'failover'::public.escalation_action_type,
        'connection_disruption'::public.incident_type,
        '{"primary_instance": "db-primary", "secondary_instance": "db-secondary", "health_check_interval": 10}'::jsonb,
        '[{"check": "instance_connectivity"}, {"check": "replication_lag"}, {"check": "write_test"}]'::jsonb,
        23,
        21,
        15.8,
        true
    ),
    (
        action3_id,
        'Conflict Resolution Rollback',
        'Rolls back conflicting changes to last known good state',
        'rollback'::public.escalation_action_type,
        'data_integrity_issue'::public.incident_type,
        '{"rollback_strategy": "point_in_time", "checkpoint_retention_hours": 24}'::jsonb,
        '[{"check": "checkpoint_exists"}, {"check": "data_consistency"}]'::jsonb,
        12,
        11,
        22.4,
        true
    );

    -- Sample Workflow Executions
    INSERT INTO public.workflow_executions (
        id, workflow_id, incident_type, severity_level, current_step, total_steps,
        status, started_at, duration_seconds, actions_executed, resolution_outcome
    ) VALUES
    (
        execution1_id,
        workflow1_id,
        'sync_failure'::public.incident_type,
        'critical'::public.severity_level,
        2,
        3,
        'in_progress'::public.remediation_status,
        CURRENT_TIMESTAMP - INTERVAL '5 minutes',
        null,
        '[{"action": "auto_retry", "result": "failed"}, {"action": "failover", "result": "in_progress"}]'::jsonb,
        null
    ),
    (
        gen_random_uuid(),
        workflow2_id,
        'connection_disruption'::public.incident_type,
        'high'::public.severity_level,
        3,
        3,
        'succeeded'::public.remediation_status,
        CURRENT_TIMESTAMP - INTERVAL '2 hours',
        480,
        '[{"action": "auto_retry", "result": "failed"}, {"action": "failover", "result": "succeeded"}]'::jsonb,
        'Successfully failed over to secondary instance after 3 retry attempts'
    );

    -- Sample Remediation Executions
    INSERT INTO public.remediation_executions (
        workflow_execution_id, remediation_action_id, execution_step, status,
        started_at, completed_at, execution_time_seconds, success, retry_attempt
    ) VALUES
    (
        execution1_id,
        action1_id,
        1,
        'failed'::public.remediation_status,
        CURRENT_TIMESTAMP - INTERVAL '5 minutes',
        CURRENT_TIMESTAMP - INTERVAL '4 minutes',
        45,
        false,
        5
    ),
    (
        execution1_id,
        action2_id,
        2,
        'in_progress'::public.remediation_status,
        CURRENT_TIMESTAMP - INTERVAL '1 minute',
        null,
        null,
        null,
        0
    );

    -- Sample Alert Routing Policies
    INSERT INTO public.alert_routing_policies (
        policy_name, description, incident_types, severity_levels,
        primary_recipients, escalation_recipients, notification_channels,
        escalation_delay_minutes, is_active, priority
    ) VALUES
    (
        'Critical Incident Routing',
        'Routes critical incidents to on-call engineers immediately',
        ARRAY['sync_failure', 'connection_disruption', 'data_integrity_issue']::public.incident_type[],
        ARRAY['critical']::public.severity_level[],
        '[{"type": "role", "value": "on_call_engineer"}, {"type": "channel", "value": "#critical-alerts"}]'::jsonb,
        '[{"type": "role", "value": "engineering_manager"}, {"type": "user", "value": "cto"}]'::jsonb,
        ARRAY['email', 'sms', 'slack']::TEXT[],
        5,
        true,
        100
    ),
    (
        'Performance Degradation Alerts',
        'Monitors and alerts on performance degradation incidents',
        ARRAY['performance_degradation']::public.incident_type[],
        ARRAY['high', 'medium']::public.severity_level[],
        '[{"type": "role", "value": "performance_team"}, {"type": "channel", "value": "#performance-alerts"}]'::jsonb,
        '[{"type": "role", "value": "platform_lead"}]'::jsonb,
        ARRAY['email', 'slack']::TEXT[],
        15,
        true,
        50
    );

    -- Sample Performance Metrics
    INSERT INTO public.policy_performance_metrics (
        workflow_id, metric_date, metric_hour, total_triggers, successful_resolutions,
        failed_resolutions, manual_interventions, average_resolution_time_minutes,
        effectiveness_score
    ) VALUES
    (
        workflow1_id,
        CURRENT_DATE,
        EXTRACT(HOUR FROM CURRENT_TIMESTAMP)::INTEGER,
        8,
        6,
        1,
        1,
        11.2,
        75.00
    ),
    (
        workflow2_id,
        CURRENT_DATE,
        EXTRACT(HOUR FROM CURRENT_TIMESTAMP)::INTEGER,
        15,
        14,
        0,
        1,
        7.5,
        93.33
    );

END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Created Tables: 6
-- Created Functions: 3
-- Created Triggers: 8
-- Mock Data: Workflows, Actions, Executions, Routing Policies, Metrics
-- ============================================================
-- Location: supabase/migrations/20251222122342_notification_templates_schedules_rules.sql
-- Schema Analysis: Extending existing notification_hub module
-- Integration Type: Extension - Adding templates, schedules, and rules
-- Dependencies: system_notifications, notification_preferences, staff_members

-- ============================================================================
-- STEP 1: CUSTOM TYPES
-- ============================================================================

-- Template variable type for dynamic content
CREATE TYPE public.template_variable_type AS ENUM (
  'text',
  'number', 
  'date',
  'priority',
  'category',
  'user_name',
  'system_name'
);

-- Schedule frequency type
CREATE TYPE public.schedule_frequency AS ENUM (
  'once',
  'daily',
  'weekly',
  'monthly',
  'custom'
);

-- Rule condition operator
CREATE TYPE public.rule_operator AS ENUM (
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'in_list'
);

-- Rule action type
CREATE TYPE public.rule_action_type AS ENUM (
  'send_notification',
  'escalate',
  'auto_acknowledge',
  'auto_resolve',
  'suppress'
);

-- ============================================================================
-- STEP 2: CORE TABLES
-- ============================================================================

-- Notification Templates Table
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  default_priority public.notification_priority DEFAULT 'medium'::public.notification_priority,
  default_category public.notification_category DEFAULT 'system'::public.notification_category,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Notification Schedules Table
CREATE TABLE public.notification_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE CASCADE,
  frequency public.schedule_frequency NOT NULL DEFAULT 'once'::public.schedule_frequency,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  schedule_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  recipient_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  template_variables JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notification Rules Table
CREATE TABLE public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  cooldown_minutes INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Schedule Execution Log Table
CREATE TABLE public.notification_schedule_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.notification_schedules(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  notification_id UUID REFERENCES public.system_notifications(id) ON DELETE SET NULL,
  error_message TEXT,
  execution_time_ms INTEGER
);

-- Rule Execution Log Table  
CREATE TABLE public.notification_rule_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.notification_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  conditions_matched JSONB,
  actions_executed JSONB,
  notification_id UUID REFERENCES public.system_notifications(id) ON DELETE SET NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- ============================================================================
-- STEP 3: INDEXES
-- ============================================================================

-- Template indexes
CREATE INDEX idx_notification_templates_active ON public.notification_templates(is_active);
CREATE INDEX idx_notification_templates_created_by ON public.notification_templates(created_by);
CREATE INDEX idx_notification_templates_category ON public.notification_templates(default_category);

-- Schedule indexes
CREATE INDEX idx_notification_schedules_active ON public.notification_schedules(is_active);
CREATE INDEX idx_notification_schedules_next_run ON public.notification_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_notification_schedules_template ON public.notification_schedules(template_id);
CREATE INDEX idx_notification_schedules_created_by ON public.notification_schedules(created_by);

-- Rule indexes
CREATE INDEX idx_notification_rules_active ON public.notification_rules(is_active);
CREATE INDEX idx_notification_rules_priority ON public.notification_rules(priority DESC);
CREATE INDEX idx_notification_rules_template ON public.notification_rules(template_id);
CREATE INDEX idx_notification_rules_created_by ON public.notification_rules(created_by);

-- Log indexes
CREATE INDEX idx_schedule_logs_schedule ON public.notification_schedule_logs(schedule_id);
CREATE INDEX idx_schedule_logs_executed_at ON public.notification_schedule_logs(executed_at DESC);
CREATE INDEX idx_rule_logs_rule ON public.notification_rule_logs(rule_id);
CREATE INDEX idx_rule_logs_triggered_at ON public.notification_rule_logs(triggered_at DESC);

-- ============================================================================
-- STEP 4: RLS POLICIES
-- ============================================================================

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_schedule_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rule_logs ENABLE ROW LEVEL SECURITY;

-- Super admin full access policies
CREATE POLICY "super_admin_full_access_templates"
ON public.notification_templates
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_full_access_schedules"
ON public.notification_schedules
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_full_access_rules"
ON public.notification_rules
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_full_access_schedule_logs"
ON public.notification_schedule_logs
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_full_access_rule_logs"
ON public.notification_rule_logs
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ============================================================================
-- STEP 5: TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_schedules_updated_at
  BEFORE UPDATE ON public.notification_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: UTILITY FUNCTIONS
-- ============================================================================

-- Function to render template with variables
CREATE OR REPLACE FUNCTION public.render_notification_template(
  template_text TEXT,
  variables JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  result TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  result := template_text;
  
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    result := replace(result, '{{' || var_key || '}}', var_value);
  END LOOP;
  
  RETURN result;
END;
$func$;

-- Function to check if rule conditions match
CREATE OR REPLACE FUNCTION public.evaluate_notification_rule(
  rule_id UUID,
  notification_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  rule_record RECORD;
  condition JSONB;
  condition_met BOOLEAN;
  all_conditions_met BOOLEAN := true;
BEGIN
  SELECT * INTO rule_record
  FROM public.notification_rules
  WHERE id = rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  FOR condition IN SELECT * FROM jsonb_array_elements(rule_record.conditions)
  LOOP
    condition_met := false;
    
    CASE condition->>'operator'
      WHEN 'equals' THEN
        condition_met := (notification_data->>condition->>'field')::TEXT = (condition->>'value')::TEXT;
      WHEN 'not_equals' THEN
        condition_met := (notification_data->>condition->>'field')::TEXT != (condition->>'value')::TEXT;
      WHEN 'contains' THEN
        condition_met := (notification_data->>condition->>'field')::TEXT LIKE '%' || (condition->>'value')::TEXT || '%';
      WHEN 'greater_than' THEN
        condition_met := (notification_data->>condition->>'field')::NUMERIC > (condition->>'value')::NUMERIC;
      WHEN 'less_than' THEN
        condition_met := (notification_data->>condition->>'field')::NUMERIC < (condition->>'value')::NUMERIC;
      ELSE
        condition_met := false;
    END CASE;
    
    IF NOT condition_met THEN
      all_conditions_met := false;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN all_conditions_met;
END;
$func$;

-- ============================================================================
-- STEP 7: MOCK DATA
-- ============================================================================

DO $$
DECLARE
  template_critical_id UUID := gen_random_uuid();
  template_system_id UUID := gen_random_uuid();
  template_maintenance_id UUID := gen_random_uuid();
  schedule_daily_id UUID := gen_random_uuid();
  rule_critical_id UUID := gen_random_uuid();
BEGIN
  -- Insert notification templates
  INSERT INTO public.notification_templates (
    id, name, description, subject_template, body_template,
    default_priority, default_category, variables
  ) VALUES
    (
      template_critical_id,
      'Critical System Alert',
      'Template for critical system failures',
      'CRITICAL: {{system_name}} - {{issue_type}}',
      'A critical issue has been detected in {{system_name}}. Issue: {{issue_description}}. Immediate action required. Severity: {{severity_level}}',
      'critical'::public.notification_priority,
      'system'::public.notification_category,
      '[{"name": "system_name", "type": "text"}, {"name": "issue_type", "type": "text"}, {"name": "issue_description", "type": "text"}, {"name": "severity_level", "type": "text"}]'::jsonb
    ),
    (
      template_system_id,
      'System Health Report',
      'Template for daily system health reports',
      'Daily System Health Report - {{report_date}}',
      'System health summary for {{report_date}}: CPU Usage: {{cpu_usage}}%, Memory: {{memory_usage}}%, Active Services: {{active_services}}',
      'medium'::public.notification_priority,
      'operations'::public.notification_category,
      '[{"name": "report_date", "type": "date"}, {"name": "cpu_usage", "type": "number"}, {"name": "memory_usage", "type": "number"}, {"name": "active_services", "type": "number"}]'::jsonb
    ),
    (
      template_maintenance_id,
      'Scheduled Maintenance Notice',
      'Template for maintenance notifications',
      'Scheduled Maintenance: {{maintenance_type}} - {{start_time}}',
      'Maintenance scheduled for {{start_time}} to {{end_time}}. Type: {{maintenance_type}}. Expected impact: {{impact_level}}. Please plan accordingly.',
      'high'::public.notification_priority,
      'admin_messages'::public.notification_category,
      '[{"name": "maintenance_type", "type": "text"}, {"name": "start_time", "type": "date"}, {"name": "end_time", "type": "date"}, {"name": "impact_level", "type": "text"}]'::jsonb
    );

  -- Insert notification schedules
  INSERT INTO public.notification_schedules (
    id, name, template_id, frequency, start_date, next_run_at,
    schedule_config, recipient_roles, template_variables
  ) VALUES
    (
      schedule_daily_id,
      'Daily Health Report',
      template_system_id,
      'daily'::public.schedule_frequency,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP + INTERVAL '1 day',
      '{"time": "09:00", "timezone": "UTC"}'::jsonb,
      ARRAY['super_admin', 'operations_manager'],
      '{"report_date": "{{date}}", "cpu_usage": "{{metric.cpu}}", "memory_usage": "{{metric.memory}}", "active_services": "{{count.services}}"}'::jsonb
    );

  -- Insert notification rules
  INSERT INTO public.notification_rules (
    id, name, description, is_active, priority, conditions, actions,
    template_id, cooldown_minutes
  ) VALUES
    (
      rule_critical_id,
      'Auto-Escalate Critical Alerts',
      'Automatically escalate unacknowledged critical alerts after 5 minutes',
      true,
      100,
      '[{"field": "priority", "operator": "equals", "value": "critical"}, {"field": "status", "operator": "equals", "value": "unread"}]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'type', 'escalate',
          'target_roles', jsonb_build_array('super_admin'),
          'notification_channels', jsonb_build_array('email', 'sms')
        ),
        jsonb_build_object(
          'type', 'send_notification',
          'template_id', template_critical_id
        )
      ),
      template_critical_id,
      5
    );

END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.notification_templates IS 'Customizable message templates for notifications with variable support';
COMMENT ON TABLE public.notification_schedules IS 'Scheduled notification jobs with frequency and timing configuration';
COMMENT ON TABLE public.notification_rules IS 'Automated rules for notification handling based on conditions and actions';
COMMENT ON TABLE public.notification_schedule_logs IS 'Execution history for scheduled notifications';
COMMENT ON TABLE public.notification_rule_logs IS 'Trigger history for notification rules';
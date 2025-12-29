import { supabase } from '@/lib/supabase';

export interface EscalationWorkflow {
  id: string;
  workflow_name: string;
  description: string | null;
  incident_type: 'sync_failure' | 'connection_disruption' | 'performance_degradation' | 'data_integrity_issue' | 'authentication_failure' | 'rate_limit_exceeded';
  severity_level: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'testing' | 'disabled';
  threshold_config: any;
  escalation_steps: any[];
  cooldown_minutes: number | null;
  max_escalations_per_hour: number | null;
  triggered_count: number;
  successful_resolutions: number;
  failed_resolutions: number;
  average_resolution_time_minutes: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  triggered_by_incident_id: string | null;
  incident_type: string;
  severity_level: string;
  trigger_conditions: any | null;
  current_step: number;
  total_steps: number | null;
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'requires_manual_intervention';
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  actions_executed: any[];
  resolution_outcome: string | null;
  error_details: string | null;
  requires_manual_intervention: boolean;
  assigned_to: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemediationAction {
  id: string;
  action_name: string;
  description: string | null;
  action_type: 'notify' | 'auto_retry' | 'failover' | 'rollback' | 'alert_team' | 'trigger_webhook' | 'execute_script' | 'manual_intervention';
  incident_type: string;
  action_config: any;
  execution_conditions: any;
  validation_steps: any[];
  rollback_config: any;
  execution_count: number;
  success_count: number;
  failure_count: number;
  average_execution_time_seconds: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertRoutingPolicy {
  id: string;
  policy_name: string;
  description: string | null;
  incident_types: string[];
  severity_levels: string[];
  primary_recipients: any[];
  escalation_recipients: any[];
  escalation_delay_minutes: number | null;
  notification_channels: string[];
  active_hours: any | null;
  is_active: boolean;
  priority: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyPerformanceMetric {
  id: string;
  workflow_id: string;
  metric_date: string;
  metric_hour: number | null;
  total_triggers: number;
  successful_resolutions: number;
  failed_resolutions: number;
  manual_interventions: number;
  average_resolution_time_minutes: number | null;
  median_resolution_time_minutes: number | null;
  fastest_resolution_minutes: number | null;
  slowest_resolution_minutes: number | null;
  effectiveness_score: number | null;
  created_at: string;
}

class EscalationWorkflowService {
  // ============================================================
  // ESCALATION WORKFLOWS
  // ============================================================

  async getAllWorkflows() {
    const { data, error } = await supabase
      .from('escalation_workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as EscalationWorkflow[];
  }

  async getWorkflowById(id: string) {
    const { data, error } = await supabase
      .from('escalation_workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as EscalationWorkflow;
  }

  async getWorkflowsByStatus(status: string) {
    const { data, error } = await supabase
      .from('escalation_workflows')
      .select('*')
      .eq('status', status)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data as EscalationWorkflow[];
  }

  async getWorkflowsByIncidentType(incidentType: string) {
    const { data, error } = await supabase
      .from('escalation_workflows')
      .select('*')
      .eq('incident_type', incidentType)
      .eq('status', 'active')
      .order('severity_level', { ascending: true });

    if (error) throw error;
    return data as EscalationWorkflow[];
  }

  async createWorkflow(workflow: Partial<EscalationWorkflow>) {
    const { data, error } = await supabase
      .from('escalation_workflows')
      .insert(workflow)
      .select()
      .single();

    if (error) throw error;
    return data as EscalationWorkflow;
  }

  async updateWorkflow(id: string, updates: Partial<EscalationWorkflow>) {
    const { data, error } = await supabase
      .from('escalation_workflows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EscalationWorkflow;
  }

  async deleteWorkflow(id: string) {
    const { error } = await supabase
      .from('escalation_workflows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async toggleWorkflowStatus(id: string, status: 'active' | 'paused' | 'testing' | 'disabled') {
    return this.updateWorkflow(id, { status });
  }

  // ============================================================
  // WORKFLOW EXECUTIONS
  // ============================================================

  async getAllExecutions() {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select(`
        *,
        workflow:escalation_workflows(workflow_name, incident_type, severity_level)
      `)
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  }

  async getExecutionById(id: string) {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select(`
        *,
        workflow:escalation_workflows(*),
        remediation_executions(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getActiveExecutions() {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data as WorkflowExecution[];
  }

  async getRecentExecutions(limit: number = 50) {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select(`
        *,
        workflow:escalation_workflows(workflow_name, incident_type)
      `)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async updateExecution(id: string, updates: Partial<WorkflowExecution>) {
    const { data, error } = await supabase
      .from('workflow_executions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as WorkflowExecution;
  }

  // ============================================================
  // REMEDIATION ACTIONS
  // ============================================================

  async getAllActions() {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('*')
      .order('action_name');

    if (error) throw error;
    return data as RemediationAction[];
  }

  async getActionById(id: string) {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as RemediationAction;
  }

  async getActionsByType(actionType: string) {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('*')
      .eq('action_type', actionType)
      .eq('is_active', true);

    if (error) throw error;
    return data as RemediationAction[];
  }

  async createAction(action: Partial<RemediationAction>) {
    const { data, error } = await supabase
      .from('remediation_actions')
      .insert(action)
      .select()
      .single();

    if (error) throw error;
    return data as RemediationAction;
  }

  async updateAction(id: string, updates: Partial<RemediationAction>) {
    const { data, error } = await supabase
      .from('remediation_actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as RemediationAction;
  }

  // ============================================================
  // ALERT ROUTING POLICIES
  // ============================================================

  async getAllRoutingPolicies() {
    const { data, error } = await supabase
      .from('alert_routing_policies')
      .select('*')
      .order('priority', { ascending: false });

    if (error) throw error;
    return data as AlertRoutingPolicy[];
  }

  async getRoutingPolicyById(id: string) {
    const { data, error } = await supabase
      .from('alert_routing_policies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as AlertRoutingPolicy;
  }

  async getActiveRoutingPolicies() {
    const { data, error } = await supabase
      .from('alert_routing_policies')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data as AlertRoutingPolicy[];
  }

  async createRoutingPolicy(policy: Partial<AlertRoutingPolicy>) {
    const { data, error } = await supabase
      .from('alert_routing_policies')
      .insert(policy)
      .select()
      .single();

    if (error) throw error;
    return data as AlertRoutingPolicy;
  }

  async updateRoutingPolicy(id: string, updates: Partial<AlertRoutingPolicy>) {
    const { data, error } = await supabase
      .from('alert_routing_policies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AlertRoutingPolicy;
  }

  // ============================================================
  // PERFORMANCE METRICS
  // ============================================================

  async getWorkflowMetrics(workflowId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('policy_performance_metrics')
      .select('*')
      .eq('workflow_id', workflowId)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: false });

    if (error) throw error;
    return data as PolicyPerformanceMetric[];
  }

  async getOverallMetrics(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('policy_performance_metrics')
      .select('*')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: false });

    if (error) throw error;
    return data as PolicyPerformanceMetric[];
  }

  async calculateWorkflowEffectiveness(workflowId: string) {
    const { data, error } = await supabase
      .rpc('calculate_workflow_effectiveness', { workflow_uuid: workflowId });

    if (error) throw error;
    return data;
  }

  // ============================================================
  // STATISTICS & ANALYTICS
  // ============================================================

  async getWorkflowStatistics() {
    const { data: workflows, error: workflowsError } = await supabase
      .from('escalation_workflows')
      .select('status, count');

    const { data: executions, error: executionsError } = await supabase
      .from('workflow_executions')
      .select('status, count');

    if (workflowsError || executionsError) {
      throw workflowsError || executionsError;
    }

    return {
      workflows: workflows || [],
      executions: executions || [],
    };
  }

  async getExecutionsByStatus() {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('status, incident_type, count')
      .order('status');

    if (error) throw error;
    return data || [];
  }
}

export const escalationWorkflowService = new EscalationWorkflowService();
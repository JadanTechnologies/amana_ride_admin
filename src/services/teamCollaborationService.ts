import { supabase } from '@/lib/supabase';

export interface WorkflowExecution {
  id: string;
  incident_type: 'sync_failure' | 'connection_disruption' | 'performance_degradation' | 'data_integrity_issue' | 'authentication_failure' | 'rate_limit_exceeded';
  severity_level: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'requires_manual_intervention';
  assigned_to?: string;
  resolved_by?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  current_step?: number;
  total_steps?: number;
  duration_seconds?: number;
  resolution_notes?: string;
  resolution_outcome?: string;
  error_details?: string;
  requires_manual_intervention?: boolean;
  workflow_id?: string;
  actions_executed?: any[];
}

export interface StaffMember {
  id: string;
  employee_id: string;
  job_title: string;
  department: string;
  employment_status: 'active' | 'inactive' | 'on_leave' | 'probation' | 'terminated';
  user_profile_id: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  description: string;
  category: 'system' | 'operations' | 'security' | 'admin_messages';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'unread' | 'read' | 'acknowledged' | 'resolved';
  assigned_to?: string;
  created_by?: string;
  acknowledged_by?: string;
  resolved_by?: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  metadata?: any;
}

export interface RemediationExecution {
  id: string;
  workflow_execution_id?: string;
  remediation_action_id?: string;
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'requires_manual_intervention';
  execution_step?: number;
  started_at?: string;
  completed_at?: string;
  execution_time_seconds?: number;
  success?: boolean;
  error_message?: string;
  retry_attempt?: number;
}

export interface CollaborationMetrics {
  activeIncidents: number;
  teamMembersOnline: number;
  pendingApprovals: number;
  averageResolutionTime: number;
  escalationQueueDepth: number;
  communicationActivity: number;
}

// Get active workflow executions (incidents)
export async function getActiveIncidents(filters?: {
  severity?: string[];
  status?: string[];
  incidentType?: string[];
}) {
  try {
    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        assigned_staff:staff_members!workflow_executions_assigned_to_fkey(id, employee_id, job_title, department),
        resolved_staff:staff_members!workflow_executions_resolved_by_fkey(id, employee_id, job_title)
      `)
      .order('created_at', { ascending: false });

    if (filters?.severity?.length) {
      query = query.in('severity_level', filters.severity);
    }

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }

    if (filters?.incidentType?.length) {
      query = query.in('incident_type', filters.incidentType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as any[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Get online team members (active staff)
export async function getTeamMembers() {
  try {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('employment_status', 'active')
      .order('job_title');

    if (error) throw error;

    return { data: data as StaffMember[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Get system notifications for team communication
export async function getTeamNotifications(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('system_notifications')
      .select(`
        *,
        assigned_staff:staff_members!system_notifications_assigned_to_fkey(id, employee_id, job_title),
        created_staff:staff_members!system_notifications_created_by_fkey(id, employee_id, job_title)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data: data as any[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Get remediation progress for incident
export async function getRemediationProgress(workflowExecutionId: string) {
  try {
    const { data, error } = await supabase
      .from('remediation_executions')
      .select('*')
      .eq('workflow_execution_id', workflowExecutionId)
      .order('execution_step');

    if (error) throw error;

    return { data: data as RemediationExecution[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Update workflow execution assignment
export async function assignIncident(workflowId: string, staffId: string) {
  try {
    const { data, error } = await supabase
      .from('workflow_executions')
      .update({ 
        assigned_to: staffId,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Update workflow execution status
export async function updateIncidentStatus(
  workflowId: string, 
  status: WorkflowExecution['status'],
  resolutionNotes?: string
) {
  try {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'succeeded' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes;
    }

    const { data, error } = await supabase
      .from('workflow_executions')
      .update(updateData)
      .eq('id', workflowId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Create team notification
export async function createTeamNotification(
  title: string,
  description: string,
  priority: SystemNotification['priority'],
  assignedTo?: string
) {
  try {
    const { data, error } = await supabase
      .from('system_notifications')
      .insert({
        title,
        description,
        priority,
        assigned_to: assignedTo,
        category: 'operations',
        status: 'unread'
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Acknowledge notification
export async function acknowledgeNotification(notificationId: string, staffId: string) {
  try {
    const { data, error } = await supabase
      .from('system_notifications')
      .update({
        status: 'acknowledged',
        acknowledged_by: staffId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Get collaboration metrics
export async function getCollaborationMetrics(): Promise<{ data: CollaborationMetrics | null, error: string | null }> {
  try {
    // Active incidents
    const { data: activeIncidents } = await supabase
      .from('workflow_executions')
      .select('id', { count: 'exact' })
      .in('status', ['pending', 'in_progress']);

    // Active staff members
    const { data: activeStaff } = await supabase
      .from('staff_members')
      .select('id', { count: 'exact' })
      .eq('employment_status', 'active');

    // Pending approvals (manual intervention required)
    const { data: pendingApprovals } = await supabase
      .from('workflow_executions')
      .select('id', { count: 'exact' })
      .eq('requires_manual_intervention', true)
      .in('status', ['pending', 'in_progress']);

    // Average resolution time
    const { data: completedWorkflows } = await supabase
      .from('workflow_executions')
      .select('duration_seconds')
      .not('duration_seconds', 'is', null)
      .in('status', ['succeeded'])
      .limit(100);

    const avgResolutionTime = completedWorkflows?.length
      ? completedWorkflows.reduce((sum, w) => sum + (w.duration_seconds || 0), 0) / completedWorkflows.length / 60
      : 0;

    // Escalation queue
    const { data: escalations } = await supabase
      .from('workflow_executions')
      .select('id', { count: 'exact' })
      .in('severity_level', ['critical', 'high'])
      .in('status', ['pending', 'in_progress']);

    // Communication activity (recent notifications)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentNotifications } = await supabase
      .from('system_notifications')
      .select('id', { count: 'exact' })
      .gte('created_at', oneHourAgo);

    const metrics: CollaborationMetrics = {
      activeIncidents: activeIncidents?.length || 0,
      teamMembersOnline: activeStaff?.length || 0,
      pendingApprovals: pendingApprovals?.length || 0,
      averageResolutionTime: Math.round(avgResolutionTime),
      escalationQueueDepth: escalations?.length || 0,
      communicationActivity: recentNotifications?.length || 0
    };

    return { data: metrics, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Subscribe to real-time incident updates
export function subscribeToIncidentUpdates(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('workflow_executions_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workflow_executions'
      },
      callback
    )
    .subscribe();

  return subscription;
}

// Subscribe to real-time notification updates
export function subscribeToNotificationUpdates(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('notifications_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'system_notifications'
      },
      callback
    )
    .subscribe();

  return subscription;
}
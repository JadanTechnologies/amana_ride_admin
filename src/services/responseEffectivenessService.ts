import { supabase } from '@/lib/supabase';

export interface EffectivenessOverview {
  totalWorkflows: number;
  totalExecutions: number;
  overallSuccessRate: number;
  avgResolutionTime: number;
  criticalIncidents: number;
  autoResolvedIncidents: number;
}

export interface WorkflowPerformance {
  id: string;
  workflow_name: string;
  incident_type: string;
  severity_level: string;
  triggered_count: number;
  successful_resolutions: number;
  failed_resolutions: number;
  success_rate: number;
  average_resolution_time_minutes: number | null;
  last_triggered_at: string | null;
}

export interface RemediationPerformance {
  status: string;
  count: number;
  avg_execution_time: number;
  success_rate: number;
}

export interface TeamMemberPerformance {
  id: string;
  employee_id: string;
  job_title: string;
  department: string;
  assigned_incidents: number;
  resolved_incidents: number;
  resolution_rate: number;
  avg_resolution_time: number;
}

export interface PlaybookEffectiveness {
  id: string;
  playbook_name: string;
  incident_type: string;
  usage_count: number;
  avg_effectiveness_rating: number;
  avg_resolution_time: number;
  completion_rate: number;
}

export interface IncidentTypeMetrics {
  incident_type: string;
  total_incidents: number;
  resolved_count: number;
  failed_count: number;
  in_progress_count: number;
  success_rate: number;
  avg_resolution_time: number;
}

export interface TimeSeriesMetric {
  date: string;
  total_triggers: number;
  successful_resolutions: number;
  failed_resolutions: number;
  avg_resolution_time: number;
  effectiveness_score: number;
}

class ResponseEffectivenessService {
  async getEffectivenessOverview(): Promise<EffectivenessOverview | null> {
    try {
      const [workflowsResult, executionsResult] = await Promise.all([
        supabase.from('escalation_workflows').select('*', { count: 'exact' }),
        supabase.from('workflow_executions').select('*')
      ]);

      if (workflowsResult.error) throw workflowsResult.error;
      if (executionsResult.error) throw executionsResult.error;

      const executions = executionsResult.data || [];
      const successfulExecutions = executions.filter(e => e.status === 'succeeded').length;
      const totalExecutions = executions.length;
      const criticalExecutions = executions.filter(e => e.severity_level === 'critical').length;
      
      const completedExecutions = executions.filter(e => e.completed_at && e.started_at);
      const totalResolutionTime = completedExecutions.reduce((sum, e) => {
        const start = new Date(e.started_at!).getTime();
        const end = new Date(e.completed_at!).getTime();
        return sum + (end - start) / 1000 / 60;
      }, 0);

      return {
        totalWorkflows: workflowsResult.count || 0,
        totalExecutions,
        overallSuccessRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
        avgResolutionTime: completedExecutions.length > 0 ? totalResolutionTime / completedExecutions.length : 0,
        criticalIncidents: criticalExecutions,
        autoResolvedIncidents: executions.filter(e => !e.requires_manual_intervention && e.status === 'succeeded').length
      };
    } catch (error) {
      return null;
    }
  }

  async getWorkflowPerformance(): Promise<WorkflowPerformance[]> {
    try {
      const { data, error } = await supabase
        .from('escalation_workflows')
        .select('*')
        .order('triggered_count', { ascending: false });

      if (error) throw error;

      return (data || []).map(workflow => ({
        id: workflow.id,
        workflow_name: workflow.workflow_name,
        incident_type: workflow.incident_type,
        severity_level: workflow.severity_level,
        triggered_count: workflow.triggered_count || 0,
        successful_resolutions: workflow.successful_resolutions || 0,
        failed_resolutions: workflow.failed_resolutions || 0,
        success_rate: workflow.triggered_count > 0
          ? ((workflow.successful_resolutions || 0) / workflow.triggered_count) * 100
          : 0,
        average_resolution_time_minutes: workflow.average_resolution_time_minutes,
        last_triggered_at: workflow.last_triggered_at
      }));
    } catch (error) {
      return [];
    }
  }

  async getRemediationPerformance(): Promise<RemediationPerformance[]> {
    try {
      const { data, error } = await supabase
        .from('remediation_executions')
        .select('status, execution_time_seconds, success');

      if (error) throw error;

      const grouped = (data || []).reduce((acc, execution) => {
        const status = execution.status || 'unknown';
        if (!acc[status]) {
          acc[status] = { count: 0, total_time: 0, successes: 0 };
        }
        acc[status].count += 1;
        acc[status].total_time += execution.execution_time_seconds || 0;
        if (execution.success) acc[status].successes += 1;
        return acc;
      }, {} as Record<string, { count: number; total_time: number; successes: number }>);

      return Object.entries(grouped).map(([status, stats]) => ({
        status,
        count: stats.count,
        avg_execution_time: stats.count > 0 ? stats.total_time / stats.count : 0,
        success_rate: stats.count > 0 ? (stats.successes / stats.count) * 100 : 0
      }));
    } catch (error) {
      return [];
    }
  }

  async getTeamPerformance(): Promise<TeamMemberPerformance[]> {
    try {
      const { data: executions, error: execError } = await supabase
        .from('workflow_executions')
        .select(`
          assigned_to,
          resolved_by,
          status,
          started_at,
          completed_at
        `);

      if (execError) throw execError;

      const memberStats = new Map<string, {
        assigned: number;
        resolved: number;
        total_time: number;
        completed_count: number;
      }>();

      (executions || []).forEach(exec => {
        if (exec.assigned_to) {
          const stats = memberStats.get(exec.assigned_to) || {
            assigned: 0, resolved: 0, total_time: 0, completed_count: 0
          };
          stats.assigned += 1;
          memberStats.set(exec.assigned_to, stats);
        }

        if (exec.resolved_by && exec.status === 'succeeded') {
          const stats = memberStats.get(exec.resolved_by) || {
            assigned: 0, resolved: 0, total_time: 0, completed_count: 0
          };
          stats.resolved += 1;

          if (exec.started_at && exec.completed_at) {
            const resolutionTime = (new Date(exec.completed_at).getTime() - 
                                   new Date(exec.started_at).getTime()) / 1000 / 60;
            stats.total_time += resolutionTime;
            stats.completed_count += 1;
          }
          memberStats.set(exec.resolved_by, stats);
        }
      });

      const memberIds = Array.from(memberStats.keys()).filter(id => id);
      if (memberIds.length === 0) return [];

      const { data: staffData, error: staffError } = await supabase
        .from('staff_members')
        .select('id, employee_id, job_title, department')
        .in('id', memberIds);

      if (staffError) throw staffError;

      return (staffData || []).map(staff => {
        const stats = memberStats.get(staff.id) || { 
          assigned: 0, resolved: 0, total_time: 0, completed_count: 0 
        };
        return {
          id: staff.id,
          employee_id: staff.employee_id,
          job_title: staff.job_title,
          department: staff.department,
          assigned_incidents: stats.assigned,
          resolved_incidents: stats.resolved,
          resolution_rate: stats.assigned > 0 ? (stats.resolved / stats.assigned) * 100 : 0,
          avg_resolution_time: stats.completed_count > 0 
            ? stats.total_time / stats.completed_count 
            : 0
        };
      }).sort((a, b) => b.resolved_incidents - a.resolved_incidents);
    } catch (error) {
      return [];
    }
  }

  async getPlaybookEffectiveness(): Promise<PlaybookEffectiveness[]> {
    try {
      const { data, error } = await supabase
        .from('incident_playbooks')
        .select(`
          id,
          playbook_name,
          incident_type,
          usage_count,
          effectiveness_score
        `)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;

      const playbookIds = (data || []).map(p => p.id);
      if (playbookIds.length === 0) return [];

      const { data: activations, error: actError } = await supabase
        .from('playbook_activations')
        .select('playbook_id, effectiveness_rating, actual_resolution_time_minutes, tasks_completed, tasks_total')
        .in('playbook_id', playbookIds);

      if (actError) throw actError;

      const activationsByPlaybook = (activations || []).reduce((acc, act) => {
        if (!acc[act.playbook_id]) acc[act.playbook_id] = [];
        acc[act.playbook_id].push(act);
        return acc;
      }, {} as Record<string, typeof activations>);

      return (data || []).map(playbook => {
        const acts = activationsByPlaybook[playbook.id] || [];
        const avgRating = acts.length > 0
          ? acts.reduce((sum, a) => sum + (a.effectiveness_rating || 0), 0) / acts.length
          : 0;
        const avgTime = acts.length > 0
          ? acts.reduce((sum, a) => sum + (a.actual_resolution_time_minutes || 0), 0) / acts.length
          : 0;
        const completionRate = acts.length > 0
          ? (acts.filter(a => a.tasks_completed === a.tasks_total).length / acts.length) * 100
          : 0;

        return {
          id: playbook.id,
          playbook_name: playbook.playbook_name,
          incident_type: playbook.incident_type,
          usage_count: playbook.usage_count || 0,
          avg_effectiveness_rating: avgRating,
          avg_resolution_time: avgTime,
          completion_rate: completionRate
        };
      });
    } catch (error) {
      return [];
    }
  }

  async getIncidentTypeMetrics(): Promise<IncidentTypeMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('incident_type, status, started_at, completed_at');

      if (error) throw error;

      const grouped = (data || []).reduce((acc, exec) => {
        const type = exec.incident_type;
        if (!acc[type]) {
          acc[type] = {
            total: 0, resolved: 0, failed: 0, in_progress: 0,
            total_time: 0, completed_count: 0
          };
        }
        acc[type].total += 1;
        if (exec.status === 'succeeded') acc[type].resolved += 1;
        if (exec.status === 'failed') acc[type].failed += 1;
        if (exec.status === 'in_progress') acc[type].in_progress += 1;

        if (exec.started_at && exec.completed_at) {
          const time = (new Date(exec.completed_at).getTime() - 
                       new Date(exec.started_at).getTime()) / 1000 / 60;
          acc[type].total_time += time;
          acc[type].completed_count += 1;
        }
        return acc;
      }, {} as Record<string, any>);

      return Object.entries(grouped).map(([type, stats]) => ({
        incident_type: type,
        total_incidents: stats.total,
        resolved_count: stats.resolved,
        failed_count: stats.failed,
        in_progress_count: stats.in_progress,
        success_rate: stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0,
        avg_resolution_time: stats.completed_count > 0 
          ? stats.total_time / stats.completed_count 
          : 0
      })).sort((a, b) => b.total_incidents - a.total_incidents);
    } catch (error) {
      return [];
    }
  }

  async getTimeSeriesMetrics(days: number = 7): Promise<TimeSeriesMetric[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('policy_performance_metrics')
        .select('*')
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;

      const grouped = (data || []).reduce((acc, metric) => {
        const date = metric.metric_date;
        if (!acc[date]) {
          acc[date] = {
            total_triggers: 0,
            successful_resolutions: 0,
            failed_resolutions: 0,
            total_time: 0,
            time_count: 0,
            effectiveness_scores: []
          };
        }
        acc[date].total_triggers += metric.total_triggers || 0;
        acc[date].successful_resolutions += metric.successful_resolutions || 0;
        acc[date].failed_resolutions += metric.failed_resolutions || 0;
        if (metric.average_resolution_time_minutes) {
          acc[date].total_time += metric.average_resolution_time_minutes;
          acc[date].time_count += 1;
        }
        if (metric.effectiveness_score) {
          acc[date].effectiveness_scores.push(metric.effectiveness_score);
        }
        return acc;
      }, {} as Record<string, any>);

      return Object.entries(grouped).map(([date, stats]) => ({
        date,
        total_triggers: stats.total_triggers,
        successful_resolutions: stats.successful_resolutions,
        failed_resolutions: stats.failed_resolutions,
        avg_resolution_time: stats.time_count > 0 ? stats.total_time / stats.time_count : 0,
        effectiveness_score: stats.effectiveness_scores.length > 0
          ? stats.effectiveness_scores.reduce((a: number, b: number) => a + b, 0) / stats.effectiveness_scores.length
          : 0
      }));
    } catch (error) {
      return [];
    }
  }
}

export const responseEffectivenessService = new ResponseEffectivenessService();
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';
import { escalationWorkflowService } from '@/services/escalationWorkflowService';

interface WorkflowMetrics {
  totalActiveWorkflows: number;
  triggeredEscalationsToday: number;
  successfulAutoRecoveries: number;
  manualInterventionsRequired: number;
  averageResolutionTime: number;
  policyEffectivenessRate: number;
}

export default function AutomatedEscalationRemediationWorkflows() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  // Data states
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [remediationActions, setRemediationActions] = useState<any[]>([]);
  const [routingPolicies, setRoutingPolicies] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<WorkflowMetrics>({
    totalActiveWorkflows: 0,
    triggeredEscalationsToday: 0,
    successfulAutoRecoveries: 0,
    manualInterventionsRequired: 0,
    averageResolutionTime: 0,
    policyEffectivenessRate: 0,
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Check if user is super admin
  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_super_admin');
        
        if (error) {
          console.error('Error checking super admin status:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data);
        }
      } catch (err) {
        console.error('Failed to check super admin status:', err);
        setIsSuperAdmin(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSuperAdminStatus();
  }, [user]);

  // Redirect logic
  useEffect(() => {
    if (!authLoading && !checkingAuth) {
      if (!user) {
        router.push('/admin-login');
      } else if (isSuperAdmin === false) {
        router.push('/admin-login?error=unauthorized');
      }
    }
  }, [user, authLoading, isSuperAdmin, checkingAuth, router]);

  // Load data
  useEffect(() => {
    if (isSuperAdmin === true) {
      loadData();
    }
  }, [isSuperAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load workflows
      const workflowsData = await escalationWorkflowService.getAllWorkflows();
      setWorkflows(workflowsData || []);

      // Load recent executions
      const executionsData = await escalationWorkflowService.getRecentExecutions(20);
      setRecentExecutions(executionsData || []);

      // Load remediation actions
      const actionsData = await escalationWorkflowService.getAllActions();
      setRemediationActions(actionsData || []);

      // Load routing policies
      const policiesData = await escalationWorkflowService.getActiveRoutingPolicies();
      setRoutingPolicies(policiesData || []);

      // Calculate metrics
      calculateMetrics(workflowsData || [], executionsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (workflowsData: any[], executionsData: any[]) => {
    const activeWorkflows = workflowsData?.filter((w) => w.status === 'active').length || 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayExecutions = executionsData?.filter((e) => 
      new Date(e.started_at) >= today
    ) || [];
    
    const successfulRecoveries = executionsData?.filter((e) => 
      e.status === 'succeeded' && !e.requires_manual_intervention
    ).length || 0;
    
    const manualInterventions = executionsData?.filter((e) => 
      e.requires_manual_intervention || e.status === 'requires_manual_intervention'
    ).length || 0;
    
    const completedExecutions = executionsData?.filter((e) => e.duration_seconds) || [];
    const avgResolution = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / completedExecutions.length / 60
      : 0;
    
    const totalExecutions = executionsData?.length || 0;
    const effectivenessRate = totalExecutions > 0
      ? (successfulRecoveries / totalExecutions) * 100
      : 0;

    setMetrics({
      totalActiveWorkflows: activeWorkflows,
      triggeredEscalationsToday: todayExecutions.length,
      successfulAutoRecoveries: successfulRecoveries,
      manualInterventionsRequired: manualInterventions,
      averageResolutionTime: Number(avgResolution.toFixed(1)),
      policyEffectivenessRate: Number(effectivenessRate.toFixed(1)),
    });
  };

  // Filter workflows
  const filteredWorkflows = workflows?.filter((workflow) => {
    if (statusFilter !== 'all' && workflow.status !== statusFilter) return false;
    if (incidentTypeFilter !== 'all' && workflow.incident_type !== incidentTypeFilter) return false;
    if (severityFilter !== 'all' && workflow.severity_level !== severityFilter) return false;
    return true;
  }) || [];

  // Show loading while checking authentication
  if (authLoading || checkingAuth || isSuperAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render page if not super admin
  if (!user || isSuperAdmin === false) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader 
          userName="Admin User"
          userRole="Super Admin"
        />
        
        <main className="p-6">
          <div className="max-w-[1920px] mx-auto">
            <NavigationBreadcrumbs />
            
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                Automated Escalation & Remediation Workflows
              </h1>
              <p className="text-muted-foreground">
                Intelligent threshold monitoring, alert routing policies, and self-healing capabilities for incident response automation
              </p>
            </div>

            {/* Header Controls */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="testing">Testing</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Incident Type Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Incident Type:</label>
                <select
                  value={incidentTypeFilter}
                  onChange={(e) => setIncidentTypeFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Types</option>
                  <option value="sync_failure">Sync Failures</option>
                  <option value="connection_disruption">Connection Issues</option>
                  <option value="performance_degradation">Performance</option>
                  <option value="data_integrity_issue">Data Integrity</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Severity:</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Levels</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <button
                onClick={loadData}
                className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Refresh Data
              </button>
            </div>

            {/* Metrics Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground">Active Workflows</div>
                <div className="mt-2 text-2xl font-bold text-foreground">{metrics.totalActiveWorkflows}</div>
                <div className="mt-1 text-xs text-muted-foreground">Monitoring incidents</div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground">Escalations Today</div>
                <div className="mt-2 text-2xl font-bold text-foreground">{metrics.triggeredEscalationsToday}</div>
                <div className="mt-1 text-xs text-muted-foreground">Triggered workflows</div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground">Auto Recoveries</div>
                <div className="mt-2 text-2xl font-bold text-green-600">{metrics.successfulAutoRecoveries}</div>
                <div className="mt-1 text-xs text-muted-foreground">Successful resolutions</div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground">Manual Required</div>
                <div className="mt-2 text-2xl font-bold text-orange-600">{metrics.manualInterventionsRequired}</div>
                <div className="mt-1 text-xs text-muted-foreground">Need intervention</div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground">Avg Resolution</div>
                <div className="mt-2 text-2xl font-bold text-foreground">{metrics.averageResolutionTime}m</div>
                <div className="mt-1 text-xs text-muted-foreground">Time to resolve</div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground">Effectiveness</div>
                <div className="mt-2 text-2xl font-bold text-foreground">{metrics.policyEffectivenessRate}%</div>
                <div className="mt-1 text-xs text-muted-foreground">Success rate</div>
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                  <p className="mt-4 text-gray-600">Loading workflows...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                {/* Main Content - Workflow Configuration (8 cols) */}
                <div className="xl:col-span-8">
                  <div className="rounded-lg border border-border bg-card">
                    <div className="border-b border-border p-4">
                      <h2 className="text-lg font-semibold text-foreground">Escalation Workflows</h2>
                      <p className="text-sm text-muted-foreground">Configure threshold triggers and escalation pathways</p>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-4">
                        {filteredWorkflows.map((workflow) => (
                          <div key={workflow.id} className="rounded-lg border border-border bg-background p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-foreground">{workflow.workflow_name}</h3>
                                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                    workflow.status === 'active' ? 'bg-green-100 text-green-700' :
                                    workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                    workflow.status === 'testing'? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {workflow.status}
                                  </span>
                                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                    workflow.severity_level === 'critical' ? 'bg-red-100 text-red-700' :
                                    workflow.severity_level === 'high' ? 'bg-orange-100 text-orange-700' :
                                    workflow.severity_level === 'medium'? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {workflow.severity_level}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p>
                                
                                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="ml-1 font-medium text-foreground">
                                      {workflow.incident_type.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Triggered:</span>
                                    <span className="ml-1 font-medium text-foreground">{workflow.triggered_count}x</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Success Rate:</span>
                                    <span className="ml-1 font-medium text-green-600">
                                      {workflow.triggered_count > 0 
                                        ? Math.round((workflow.successful_resolutions / workflow.triggered_count) * 100)
                                        : 0}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Avg Resolution:</span>
                                    <span className="ml-1 font-medium text-foreground">
                                      {workflow.average_resolution_time_minutes?.toFixed(1) || '0.0'}m
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {filteredWorkflows.length === 0 && (
                          <div className="py-8 text-center text-muted-foreground">
                            No workflows match the selected filters
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar - Recent Activity & Performance (4 cols) */}
                <div className="xl:col-span-4">
                  <div className="space-y-6">
                    {/* Recent Escalations */}
                    <div className="rounded-lg border border-border bg-card">
                      <div className="border-b border-border p-4">
                        <h3 className="font-semibold text-foreground">Recent Escalations</h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-3">
                          {recentExecutions.slice(0, 5).map((execution) => (
                            <div key={execution.id} className="rounded border border-border bg-background p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${
                                      execution.status === 'succeeded' ? 'bg-green-500' :
                                      execution.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                                      execution.status === 'failed'? 'bg-red-500' : 'bg-yellow-500'
                                    }`} />
                                    <span className="text-sm font-medium text-foreground">
                                      {execution.workflow?.workflow_name || 'Unknown Workflow'}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {execution.incident_type?.replace(/_/g, ' ')} · {execution.severity_level}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {new Date(execution.started_at).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Remediation Actions */}
                    <div className="rounded-lg border border-border bg-card">
                      <div className="border-b border-border p-4">
                        <h3 className="font-semibold text-foreground">Remediation Actions</h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-3">
                          {remediationActions.slice(0, 5).map((action) => (
                            <div key={action.id} className="rounded border border-border bg-background p-3">
                              <div className="font-medium text-foreground text-sm">{action.action_name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{action.action_type.replace(/_/g, ' ')}</div>
                              <div className="mt-2 flex gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Executed:</span>
                                  <span className="ml-1 font-medium text-foreground">{action.execution_count}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Success:</span>
                                  <span className="ml-1 font-medium text-green-600">
                                    {action.execution_count > 0 
                                      ? Math.round((action.success_count / action.execution_count) * 100)
                                      : 0}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Alert Routing */}
                    <div className="rounded-lg border border-border bg-card">
                      <div className="border-b border-border p-4">
                        <h3 className="font-semibold text-foreground">Alert Routing</h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-3">
                          {routingPolicies.slice(0, 3).map((policy) => (
                            <div key={policy.id} className="rounded border border-border bg-background p-3">
                              <div className="font-medium text-foreground text-sm">{policy.policy_name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Priority: {policy.priority || 0} · Channels: {policy.notification_channels?.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}
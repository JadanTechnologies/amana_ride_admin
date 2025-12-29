'use client';

import React, { useState, useEffect } from 'react';
import { 
  getActiveIncidents, 
  getTeamMembers, 
  getTeamNotifications,
  getCollaborationMetrics,
  assignIncident,
  updateIncidentStatus,
  createTeamNotification,
  acknowledgeNotification,
  subscribeToIncidentUpdates,
  subscribeToNotificationUpdates,
  type WorkflowExecution,
  type StaffMember,
  type SystemNotification,
  type CollaborationMetrics
} from '@/services/teamCollaborationService';

export default function RealTimeTeamCollaborationHub() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'communication' | 'approvals'>('incidents');
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  
  const [incidents, setIncidents] = useState<WorkflowExecution[]>([]);
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [metrics, setMetrics] = useState<CollaborationMetrics | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<WorkflowExecution | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [selectedPriority, selectedStatus]);

  // Set up real-time subscriptions
  useEffect(() => {
    const incidentSub = subscribeToIncidentUpdates((payload) => {
      console.log('Incident update:', payload);
      loadData();
    });

    const notificationSub = subscribeToNotificationUpdates((payload) => {
      console.log('Notification update:', payload);
      loadNotifications();
    });

    return () => {
      incidentSub.unsubscribe();
      notificationSub.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        severity: selectedPriority.length > 0 ? selectedPriority : undefined,
        status: selectedStatus.length > 0 ? selectedStatus : undefined
      };

      const [incidentsRes, membersRes, metricsRes] = await Promise.all([
        getActiveIncidents(filters),
        getTeamMembers(),
        getCollaborationMetrics()
      ]);

      if (incidentsRes.error) throw new Error(incidentsRes.error);
      if (membersRes.error) throw new Error(membersRes.error);
      if (metricsRes.error) throw new Error(metricsRes.error);

      setIncidents(incidentsRes.data || []);
      setTeamMembers(membersRes.data || []);
      setMetrics(metricsRes.data);

      await loadNotifications();
    } catch (err: any) {
      setError(err.message || 'Failed to load collaboration data');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    const notificationsRes = await getTeamNotifications(50);
    if (notificationsRes.data) {
      setNotifications(notificationsRes.data);
    }
  };

  const handleAssignIncident = async (incidentId: string, staffId: string) => {
    setActionLoading(true);
    const { error } = await assignIncident(incidentId, staffId);
    
    if (error) {
      setError(error);
    } else {
      await loadData();
    }
    setActionLoading(false);
  };

  const handleUpdateStatus = async (
    incidentId: string, 
    status: WorkflowExecution['status'],
    notes?: string
  ) => {
    setActionLoading(true);
    const { error } = await updateIncidentStatus(incidentId, status, notes);
    
    if (error) {
      setError(error);
    } else {
      await loadData();
      setSelectedIncident(null);
    }
    setActionLoading(false);
  };

  const handleSendNotification = async (
    title: string,
    description: string,
    priority: SystemNotification['priority']
  ) => {
    setActionLoading(true);
    const { error } = await createTeamNotification(title, description, priority);
    
    if (error) {
      setError(error);
    } else {
      await loadNotifications();
    }
    setActionLoading(false);
  };

  const handleAcknowledgeNotification = async (notificationId: string) => {
    const mockStaffId = teamMembers[0]?.id;
    if (!mockStaffId) return;

    const { error } = await acknowledgeNotification(notificationId, mockStaffId);
    
    if (error) {
      setError(error);
    } else {
      await loadNotifications();
    }
  };

  const togglePriority = (priority: string) => {
    setSelectedPriority(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'succeeded': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'requires_manual_intervention': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading collaboration hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Real-Time Team Collaboration Hub</h1>
              <p className="text-sm text-gray-500 mt-1">
                Coordinate incident response and emergency resolution workflows
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Emergency Broadcast
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Priority Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Priority:</span>
              {['critical', 'high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => togglePriority(priority)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    selectedPriority.includes(priority)
                      ? getSeverityColor(priority)
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {priority.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Role Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="incident_commander">Incident Commander</option>
                <option value="technical_lead">Technical Lead</option>
                <option value="operations">Operations</option>
                <option value="security">Security</option>
              </select>
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              {['pending', 'in_progress', 'requires_manual_intervention', 'succeeded'].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedStatus.includes(status)
                      ? getStatusColor(status)
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {status === 'requires_manual_intervention' ? 'PENDING APPROVAL' : status.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Metrics Row */}
      {metrics && (
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="grid grid-cols-6 gap-4">
            <MetricCard
              title="Active Incidents"
              value={metrics.activeIncidents}
              trend="up"
              trendValue="+3"
              icon="🚨"
            />
            <MetricCard
              title="Team Online"
              value={metrics.teamMembersOnline}
              trend="neutral"
              icon="👥"
            />
            <MetricCard
              title="Pending Approvals"
              value={metrics.pendingApprovals}
              trend="down"
              trendValue="-2"
              icon="✋"
            />
            <MetricCard
              title="Avg Resolution"
              value={`${metrics.averageResolutionTime}m`}
              trend="down"
              trendValue="-5m"
              icon="⏱️"
            />
            <MetricCard
              title="Escalation Queue"
              value={metrics.escalationQueueDepth}
              trend="up"
              trendValue="+1"
              icon="📈"
            />
            <MetricCard
              title="Communication"
              value={metrics.communicationActivity}
              trend="up"
              trendValue="+12"
              icon="💬"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 pb-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Workspace (8 cols) */}
          <div className="col-span-8 space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border p-2 flex gap-2">
              <button
                onClick={() => setActiveTab('incidents')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'incidents' ?'bg-blue-600 text-white' :'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Incident Board ({incidents.length})
              </button>
              <button
                onClick={() => setActiveTab('communication')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'communication' ?'bg-blue-600 text-white' :'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Team Communication ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'approvals' ?'bg-blue-600 text-white' :'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Approval Queue ({metrics?.pendingApprovals || 0})
              </button>
            </div>

            {/* Incident Board */}
            {activeTab === 'incidents' && (
              <div className="space-y-4">
                {incidents.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Active Incidents
                    </h3>
                    <p className="text-gray-500">
                      All systems operating normally. Great job team!
                    </p>
                  </div>
                ) : (
                  incidents.map((incident) => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      teamMembers={teamMembers}
                      onAssign={handleAssignIncident}
                      onUpdateStatus={handleUpdateStatus}
                      onSelect={setSelectedIncident}
                      isSelected={selectedIncident?.id === incident.id}
                      actionLoading={actionLoading}
                    />
                  ))
                )}
              </div>
            )}

            {/* Team Communication */}
            {activeTab === 'communication' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900">Team Messages & Notifications</h3>
                </div>
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onAcknowledge={handleAcknowledgeNotification}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Approval Queue */}
            {activeTab === 'approvals' && (
              <div className="space-y-4">
                {incidents.filter(i => i.requires_manual_intervention).length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Pending Approvals
                    </h3>
                    <p className="text-gray-500">
                      All incidents are being handled automatically
                    </p>
                  </div>
                ) : (
                  incidents
                    .filter(i => i.requires_manual_intervention)
                    .map((incident) => (
                      <ApprovalCard
                        key={incident.id}
                        incident={incident}
                        onApprove={() => handleUpdateStatus(incident.id, 'in_progress')}
                        onReject={() => handleUpdateStatus(incident.id, 'failed', 'Manual rejection')}
                        actionLoading={actionLoading}
                      />
                    ))
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar (4 cols) */}
          <div className="col-span-4 space-y-6">
            {/* Team Availability */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Team Availability</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {teamMembers.length} members online
                </p>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {teamMembers.slice(0, 10).map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {member.employee_id.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.job_title}</p>
                        <p className="text-xs text-gray-500">{member.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-500">Online</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                {notifications.slice(0, 8).map((notification) => (
                  <div key={notification.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getPriorityColor(notification.priority)}`}>
                      {notification.priority === 'critical' ? '🚨' : 
                       notification.priority === 'high' ? '⚠️' :
                       notification.priority === 'medium' ? 'ℹ️' : '📝'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <span className="text-2xl">❌</span>
            <div className="flex-1">
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  trend, 
  trendValue, 
  icon 
}: { 
  title: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && trendValue && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-red-50 text-red-600' :
            trend === 'down'? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
          }`}>
            {trendValue}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{title}</p>
    </div>
  );
}

// Incident Card Component
function IncidentCard({
  incident,
  teamMembers,
  onAssign,
  onUpdateStatus,
  onSelect,
  isSelected,
  actionLoading
}: {
  incident: WorkflowExecution;
  teamMembers: StaffMember[];
  onAssign: (incidentId: string, staffId: string) => void;
  onUpdateStatus: (incidentId: string, status: WorkflowExecution['status'], notes?: string) => void;
  onSelect: (incident: WorkflowExecution) => void;
  isSelected: boolean;
  actionLoading: boolean;
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-50/50';
      case 'high': return 'border-l-orange-500 bg-orange-50/50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50/50';
      case 'low': return 'border-l-blue-500 bg-blue-50/50';
      default: return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'succeeded': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'requires_manual_intervention': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const progress = incident.total_steps && incident.current_step
    ? Math.round((incident.current_step / incident.total_steps) * 100)
    : 0;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-4 ${getSeverityColor(incident.severity_level)} p-6 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onSelect(incident)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
              incident.severity_level === 'critical' ? 'bg-red-100 text-red-800' :
              incident.severity_level === 'high' ? 'bg-orange-100 text-orange-800' :
              incident.severity_level === 'medium'? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {incident.severity_level.toUpperCase()}
            </span>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}>
              {incident.status.replace('_', ' ')}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {incident.incident_type.replace('_', ' ').toUpperCase()}
          </h3>
          <p className="text-sm text-gray-600">
            Started: {new Date(incident.started_at || incident.created_at).toLocaleString()}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {incident.requires_manual_intervention && (
            <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              NEEDS APPROVAL
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {incident.total_steps && incident.current_step && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Remediation Progress</span>
            <span className="text-sm text-gray-600">
              Step {incident.current_step} of {incident.total_steps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Assigned Team Members */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Assigned to:</span>
          {incident.assigned_to ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                {teamMembers.find(m => m.id === incident.assigned_to)?.employee_id?.substring(0, 2).toUpperCase() || 'UN'}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {teamMembers.find(m => m.id === incident.assigned_to)?.job_title || 'Unassigned'}
              </span>
            </div>
          ) : (
            <select
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.value) {
                  onAssign(incident.id, e.target.value);
                }
              }}
              disabled={actionLoading}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select team member</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.job_title} - {member.department}
                </option>
              ))}
            </select>
          )}
        </div>

        {incident.duration_seconds && (
          <span className="text-sm text-gray-600">
            Duration: {Math.floor(incident.duration_seconds / 60)}m {incident.duration_seconds % 60}s
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        {incident.status === 'pending' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(incident.id, 'in_progress');
            }}
            disabled={actionLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Start Resolution
          </button>
        )}
        {incident.status === 'in_progress' && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(incident.id, 'succeeded', 'Resolved successfully');
              }}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Mark Resolved
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(incident.id, 'failed', 'Manual intervention failed');
              }}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Mark Failed
            </button>
          </>
        )}
      </div>

      {/* Error Details */}
      {incident.error_details && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-medium text-red-900 mb-1">Error Details:</p>
          <p className="text-xs text-red-700">{incident.error_details}</p>
        </div>
      )}

      {/* Resolution Outcome */}
      {incident.resolution_outcome && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-medium text-green-900 mb-1">Resolution:</p>
          <p className="text-xs text-green-700">{incident.resolution_outcome}</p>
        </div>
      )}
    </div>
  );
}

// Notification Item Component
function NotificationItem({
  notification,
  onAcknowledge
}: {
  notification: SystemNotification;
  onAcknowledge: (id: string) => void;
}) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return 'ℹ️';
      case 'low': return '📝';
      default: return '📧';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-50/30';
      case 'high': return 'border-l-orange-500 bg-orange-50/30';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50/30';
      case 'low': return 'border-l-blue-500 bg-blue-50/30';
      default: return 'border-l-gray-500 bg-gray-50/30';
    }
  };

  return (
    <div className={`p-4 border-l-4 ${getPriorityColor(notification.priority)} hover:bg-gray-50 transition-colors`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getPriorityIcon(notification.priority)}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-gray-900">{notification.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              notification.status === 'unread' ? 'bg-blue-100 text-blue-700' :
              notification.status === 'acknowledged' ? 'bg-green-100 text-green-700' :
              notification.status === 'resolved'? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {notification.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {new Date(notification.created_at).toLocaleString()}
            </span>
            {notification.status === 'unread' && (
              <button
                onClick={() => onAcknowledge(notification.id)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Acknowledge
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Approval Card Component
function ApprovalCard({
  incident,
  onApprove,
  onReject,
  actionLoading
}: {
  incident: WorkflowExecution;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
          ✋
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {incident.incident_type.replace('_', ' ').toUpperCase()}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Requires manual approval to proceed
          </p>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
              {incident.severity_level.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              Waiting for {Math.floor((Date.now() - new Date(incident.created_at).getTime()) / 60000)}m
            </span>
          </div>
        </div>
      </div>

      {incident.error_details && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-1">Additional Context:</p>
          <p className="text-xs text-gray-600">{incident.error_details}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={onApprove}
          disabled={actionLoading}
          className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          ✓ Approve & Continue
        </button>
        <button
          onClick={onReject}
          disabled={actionLoading}
          className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}
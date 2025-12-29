'use client';

import React, { useState, useEffect } from 'react';
import { responseEffectivenessService } from '@/services/responseEffectivenessService';
import type {
  EffectivenessOverview,
  WorkflowPerformance,
  RemediationPerformance,
  TeamMemberPerformance,
  PlaybookEffectiveness,
  IncidentTypeMetrics,
  TimeSeriesMetric
} from '@/services/responseEffectivenessService';

export default function ResponseEffectivenessMetricsPage() {
  const [overview, setOverview] = useState<EffectivenessOverview | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowPerformance[]>([]);
  const [remediations, setRemediations] = useState<RemediationPerformance[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamMemberPerformance[]>([]);
  const [playbooks, setPlaybooks] = useState<PlaybookEffectiveness[]>([]);
  const [incidentMetrics, setIncidentMetrics] = useState<IncidentTypeMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(7);
  const [activeTab, setActiveTab] = useState<'workflows' | 'team' | 'playbooks' | 'incidents'>('workflows');

  useEffect(() => {
    loadAllMetrics();
  }, [timeRange]);

  const loadAllMetrics = async () => {
    setLoading(true);
    try {
      const [
        overviewData,
        workflowData,
        remediationData,
        teamData,
        playbookData,
        incidentData,
        timeSeriesRes
      ] = await Promise.all([
        responseEffectivenessService.getEffectivenessOverview(),
        responseEffectivenessService.getWorkflowPerformance(),
        responseEffectivenessService.getRemediationPerformance(),
        responseEffectivenessService.getTeamPerformance(),
        responseEffectivenessService.getPlaybookEffectiveness(),
        responseEffectivenessService.getIncidentTypeMetrics(),
        responseEffectivenessService.getTimeSeriesMetrics(timeRange)
      ]);

      setOverview(overviewData);
      setWorkflows(workflowData);
      setRemediations(remediationData);
      setTeamPerformance(teamData);
      setPlaybooks(playbookData);
      setIncidentMetrics(incidentData);
      setTimeSeriesData(timeSeriesRes);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Response Effectiveness Metrics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive tracking of escalation success rates, remediation times, team performance, and workflow effectiveness
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button
            onClick={loadAllMetrics}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Total Workflows</div>
              <div className="text-3xl font-bold text-gray-900">{overview.totalWorkflows}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Total Executions</div>
              <div className="text-3xl font-bold text-gray-900">{overview.totalExecutions}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Success Rate</div>
              <div className="text-3xl font-bold text-green-600">
                {overview.overallSuccessRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Avg Resolution</div>
              <div className="text-3xl font-bold text-blue-600">
                {overview.avgResolutionTime.toFixed(0)}m
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Critical</div>
              <div className="text-3xl font-bold text-red-600">{overview.criticalIncidents}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Auto-Resolved</div>
              <div className="text-3xl font-bold text-green-600">{overview.autoResolvedIncidents}</div>
            </div>
          </div>
        )}

        {/* Time Series Chart */}
        {timeSeriesData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Trends</h2>
            <div className="space-y-4">
              {timeSeriesData.map((metric, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(metric.date).toLocaleDateString()}
                    </span>
                    <span className="text-sm text-gray-600">
                      Effectiveness: {metric.effectiveness_score.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Triggers: </span>
                      <span className="font-medium">{metric.total_triggers}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Resolved: </span>
                      <span className="font-medium text-green-600">{metric.successful_resolutions}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Failed: </span>
                      <span className="font-medium text-red-600">{metric.failed_resolutions}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Time: </span>
                      <span className="font-medium">{metric.avg_resolution_time.toFixed(0)}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-t-xl shadow-sm border-b border-gray-200">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'workflows' ?'bg-blue-600 text-white' :'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Workflow Performance
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'team' ?'bg-blue-600 text-white' :'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Team Performance
            </button>
            <button
              onClick={() => setActiveTab('playbooks')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'playbooks' ?'bg-blue-600 text-white' :'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Playbook Effectiveness
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'incidents' ?'bg-blue-600 text-white' :'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Incident Types
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl shadow-sm p-6 border border-gray-100">
          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Workflow Performance Analysis</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Workflow</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Severity</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Triggers</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Success</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Failed</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Success Rate</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {workflows.map((workflow) => (
                      <tr key={workflow.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {workflow.workflow_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {workflow.incident_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(workflow.severity_level)}`}>
                            {workflow.severity_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {workflow.triggered_count}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-green-600">
                          {workflow.successful_resolutions}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-red-600">
                          {workflow.failed_resolutions}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${
                            workflow.success_rate >= 80 ? 'text-green-600' :
                            workflow.success_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {workflow.success_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {workflow.average_resolution_time_minutes?.toFixed(1) || 'N/A'}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Remediation Performance */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Remediation Actions Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {remediations.map((remediation) => (
                    <div key={remediation.status} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(remediation.status)}`}>
                          {remediation.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{remediation.count} executions</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Success Rate:</span>
                          <span className="font-medium">{remediation.success_rate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Avg Execution:</span>
                          <span className="font-medium">{remediation.avg_execution_time.toFixed(1)}s</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Team Performance Tab */}
          {activeTab === 'team' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Team Member Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Job Title</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Assigned</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Resolved</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Resolution Rate</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {teamPerformance.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {member.employee_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{member.job_title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.department}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {member.assigned_incidents}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-green-600">
                          {member.resolved_incidents}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${
                            member.resolution_rate >= 80 ? 'text-green-600' :
                            member.resolution_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {member.resolution_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {member.avg_resolution_time.toFixed(1)}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Playbooks Tab */}
          {activeTab === 'playbooks' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Playbook Effectiveness Analysis</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Playbook</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Incident Type</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Usage Count</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Avg Rating</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Completion Rate</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Avg Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {playbooks.map((playbook) => (
                      <tr key={playbook.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {playbook.playbook_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {playbook.incident_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {playbook.usage_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-medium text-gray-900">
                              {playbook.avg_effectiveness_rating.toFixed(1)}
                            </span>
                            <span className="text-yellow-500">★</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${
                            playbook.completion_rate >= 80 ? 'text-green-600' :
                            playbook.completion_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {playbook.completion_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {playbook.avg_resolution_time.toFixed(1)}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Incidents Tab */}
          {activeTab === 'incidents' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Incident Type Metrics</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Incident Type</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Resolved</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Failed</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">In Progress</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Success Rate</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Avg Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {incidentMetrics.map((incident) => (
                      <tr key={incident.incident_type} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {incident.incident_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {incident.total_incidents}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-green-600">
                          {incident.resolved_count}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-red-600">
                          {incident.failed_count}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-blue-600">
                          {incident.in_progress_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${
                            incident.success_rate >= 80 ? 'text-green-600' :
                            incident.success_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {incident.success_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {incident.avg_resolution_time.toFixed(1)}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
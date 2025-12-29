'use client';

import React, { useState, useEffect } from 'react';
import { syncConflictService, SyncConflictLog, SyncRetryQueueItem, ConflictResolutionPolicy } from '@/services/syncConflictService';

interface SyncMetrics {
  totalOperations: number;
  activeConflicts: number;
  validationFailures: number;
  retryQueueDepth: number;
  resolutionSuccessRate: number;
  averageSyncLatency: number;
}

export default function RealTimeDataSyncMonitor() {
  const [conflicts, setConflicts] = useState<SyncConflictLog[]>([]);
  const [retryQueue, setRetryQueue] = useState<SyncRetryQueueItem[]>([]);
  const [policies, setPolicies] = useState<ConflictResolutionPolicy[]>([]);
  const [metrics, setMetrics] = useState<SyncMetrics>({
    totalOperations: 0,
    activeConflicts: 0,
    validationFailures: 0,
    retryQueueDepth: 0,
    resolutionSuccessRate: 0,
    averageSyncLatency: 0,
  });
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictLog | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    if (autoRefresh) {
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, statusFilter, serviceTypeFilter, severityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load conflicts
      const conflictsData = await syncConflictService.getUnresolvedConflicts();
      setConflicts(conflictsData || []);

      // Load retry queue
      const retryData = await syncConflictService.getPendingRetries();
      setRetryQueue(retryData || []);

      // Load policies
      const policiesData = await syncConflictService.getResolutionPolicies();
      setPolicies(policiesData || []);

      // Calculate metrics
      const stats = await syncConflictService.getConflictStats('dashboard-realtime');
      const resolvedCount = conflictsData?.filter((c) => c.resolved_at)?.length || 0;
      const totalCount = conflictsData?.length || 0;
      
      setMetrics({
        totalOperations: totalCount + (retryData?.length || 0),
        activeConflicts: stats?.unresolved || 0,
        validationFailures: Object.values(stats?.bySeverity || {}).reduce((a, b) => a + b, 0),
        retryQueueDepth: retryData?.length || 0,
        resolutionSuccessRate: totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0,
        averageSyncLatency: 125, // Placeholder value
      });

      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to load sync monitor data');
      setLoading(false);
    }
  };

  const handleResolveConflict = async () => {
    if (!selectedConflict) return;

    try {
      const success = await syncConflictService.resolveConflict(
        selectedConflict.id,
        { notes: resolutionNotes, resolved_manually: true },
        'current-user-id' // Replace with actual user ID from auth context
      );

      if (success) {
        setSelectedConflict(null);
        setResolutionNotes('');
        loadData();
      } else {
        setError('Failed to resolve conflict');
      }
    } catch (err: any) {
      setError(err?.message || 'Error resolving conflict');
    }
  };

  const handleRetryOperation = async (retryId: string) => {
    try {
      await syncConflictService.updateRetryStatus(retryId, 'in_progress');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to retry operation');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'succeeded': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading && conflicts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading sync monitor data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Real-Time Data Sync Monitor</h1>
        <p className="text-gray-600">
          Comprehensive oversight of data synchronization operations and conflict resolution
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm text-gray-600 mr-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        
        <div>
          <label className="text-sm text-gray-600 mr-2">Service Type:</label>
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Services</option>
            <option value="user_data">User Data</option>
            <option value="financial">Financial</option>
            <option value="operational">Operational</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 mr-2">Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh (5s)
          </label>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {autoRefresh ? 'Connected' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Total Operations</div>
          <div className="text-2xl font-bold text-gray-900">{metrics.totalOperations}</div>
          <div className="text-xs text-green-600 mt-1">↑ 12% from last hour</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Active Conflicts</div>
          <div className="text-2xl font-bold text-orange-600">{metrics.activeConflicts}</div>
          <div className="text-xs text-orange-600 mt-1">Requires attention</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Validation Failures</div>
          <div className="text-2xl font-bold text-red-600">{metrics.validationFailures}</div>
          <div className="text-xs text-red-600 mt-1">Checksum mismatches</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Retry Queue</div>
          <div className="text-2xl font-bold text-blue-600">{metrics.retryQueueDepth}</div>
          <div className="text-xs text-gray-600 mt-1">{retryQueue.filter(r => r.priority < 3).length} high priority</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Success Rate</div>
          <div className="text-2xl font-bold text-green-600">{metrics.resolutionSuccessRate.toFixed(1)}%</div>
          <div className="text-xs text-green-600 mt-1">Auto-resolution</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Avg Latency</div>
          <div className="text-2xl font-bold text-gray-900">{metrics.averageSyncLatency}ms</div>
          <div className="text-xs text-green-600 mt-1">Within target</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Monitoring Area */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Sync Operations Monitor</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retries</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conflicts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No active conflicts detected
                      </td>
                    </tr>
                  ) : (
                    conflicts.map((conflict) => (
                      <React.Fragment key={conflict.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{conflict.table_name}</div>
                            <div className="text-xs text-gray-500">{conflict.channel_name}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(conflict.detected_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${conflict.resolved_at ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                              {conflict.resolved_at ? 'Resolved' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(conflict.severity)}`}>
                              {conflict.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {conflict.auto_resolved ? (
                              <span className="text-green-600">Auto-resolved</span>
                            ) : (
                              <span className="text-orange-600">Manual required</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setExpandedConflict(expandedConflict === conflict.id ? null : conflict.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                {expandedConflict === conflict.id ? 'Hide' : 'Details'}
                              </button>
                              {!conflict.resolved_at && (
                                <button
                                  onClick={() => setSelectedConflict(conflict)}
                                  className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedConflict === conflict.id && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-gray-50">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Client Data</h4>
                                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                                    {JSON.stringify(conflict.client_data, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Server Data</h4>
                                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                                    {JSON.stringify(conflict.server_data, null, 2)}
                                  </pre>
                                </div>
                                <div className="col-span-2">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Conflict Fields</h4>
                                  <div className="flex gap-2 flex-wrap">
                                    {conflict.conflict_fields?.map((field, index) => (
                                      <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                        {field}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          {/* Live Activity Feed */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Live Activity Feed</h3>
            <div className="space-y-3">
              {conflicts.slice(0, 5).map((conflict) => (
                <div key={conflict.id} className="border-l-2 border-orange-500 pl-3">
                  <div className="text-xs text-gray-600">
                    {new Date(conflict.detected_at).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-gray-900 font-medium">{conflict.conflict_type}</div>
                  <div className="text-xs text-gray-600">{conflict.table_name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Retry Queue Status */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Retry Queue Status</h3>
            <div className="space-y-3">
              {retryQueue.slice(0, 5).map((retry) => (
                <div key={retry.id} className="pb-3 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-gray-900">{retry.operation_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeColor(retry.status)}`}>
                      {retry.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    Retry {retry.retry_count}/{retry.max_retries}
                  </div>
                  {retry.status === 'pending' && (
                    <button
                      onClick={() => handleRetryOperation(retry.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Retry Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Policy Performance */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Resolution Policies</h3>
            <div className="space-y-3">
              {policies.map((policy) => (
                <div key={policy.id} className="pb-3 border-b border-gray-100 last:border-0">
                  <div className="text-sm font-medium text-gray-900 mb-1">{policy.policy_name}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">{policy.resolution_strategy}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${policy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Priority: {policy.priority}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Resolve Conflict</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedConflict.table_name} - {selectedConflict.conflict_type}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Strategy
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="server_wins">Server Wins</option>
                  <option value="client_wins">Client Wins</option>
                  <option value="merge_changes">Merge Changes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Add notes about this resolution..."
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setSelectedConflict(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveConflict}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Resolve Conflict
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';

import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';
import { AuditLogsFilters, fetchAuditLogs, fetchAuditMetrics, fetchRecentCriticalEvents, exportAuditLogsToCSV, subscribeToAuditLogsWithHealth, subscribeToOperationsDataWithHealth, reconnectRealtimeChannels, type AuditLog } from '@/services/auditLogsService';
import { ConnectionHealth } from '@/services/realtimeConnectionManager';

interface MetricCardProps {
  title: string;
  value: number;
  trend?: string;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, icon }) => (
  <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
        {trend && (
          <p className="text-sm text-green-600 mt-1">{trend}</p>
        )}
      </div>
      <div className="text-4xl">{icon}</div>
    </div>
  </div>
);

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [criticalEvents, setCriticalEvents] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    criticalAlerts: 0,
    failedOperations: 0,
    uniqueActors: 0,
    systemModifications: 0,
    complianceViolations: 0,
  });
  const [filters, setFilters] = useState<AuditLogsFilters>({
    dateFrom: '',
    dateTo: '',
    activityType: 'all',
    severity: 'all',
    searchTerm: '',
    page: 1,
    pageSize: 20,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth | null>(null);
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);
  const [syncValidationError, setSyncValidationError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    loadAuditData();
  }, [filters]);

  useEffect(() => {
    if (!realtimeEnabled) return;

    let cleanupAuditLogs: (() => void) | null = null;
    let cleanupOperations: (() => void) | null = null;

    const setupRealtimeSubscriptions = async () => {
      try {
        // Subscribe to audit logs changes with health monitoring
        cleanupAuditLogs = await subscribeToAuditLogsWithHealth(
          (newLog) => {
            setAuditLogs((prev) => {
              const updated = [newLog, ...prev];
              return updated.slice(0, filters.pageSize || 20);
            });
            setTotalCount((prev) => prev + 1);
            setLiveUpdateCount((prev) => prev + 1);

            if (newLog.severity === 'critical') {
              setCriticalEvents((prev) => {
                const updated = [newLog, ...prev];
                return updated.slice(0, 5);
              });
            }

            refreshMetrics();
            setSyncValidationError(null);
          },
          undefined,
          undefined,
          {
            severity: filters.severity !== 'all' ? filters.severity as any : undefined,
            tableName: filters.activityType !== 'all' ? filters.activityType : undefined,
          },
          (health) => {
            setConnectionHealth(health);

            // Check for sync issues
            if (health.status === 'ERROR' || health.status === 'DISCONNECTED') {
              setSyncValidationError('Connection lost. Attempting to reconnect...');
            } else if (health.status === 'HEALTHY' || health.status === 'CONNECTED') {
              setSyncValidationError(null);
            }
          }
        );

        // Subscribe to operations data changes with health monitoring
        cleanupOperations = await subscribeToOperationsDataWithHealth(
          (data) => {
            setLiveUpdateCount((prev) => prev + 1);
            refreshMetrics();
          },
          (health) => {
            setConnectionHealth(health);
          }
        );

      } catch (error: any) {
        setSyncValidationError(error?.message || 'Failed to setup real-time subscriptions');
        setConnectionHealth({
          status: 'ERROR',
          lastHeartbeat: null,
          reconnectAttempts: 0,
          lastError: error?.message || 'Connection failed',
          lastSuccessfulSync: null,
          channelCount: 0,
        });
      }
    };

    setupRealtimeSubscriptions();

    return () => {
      if (cleanupAuditLogs) cleanupAuditLogs();
      if (cleanupOperations) cleanupOperations();
    };
  }, [realtimeEnabled, filters.severity, filters.activityType, filters.pageSize]);

  const loadAuditData = async () => {
    setLoading(true);
    setError(null);

    const [logsResult, metricsResult, criticalResult] = await Promise.all([
      fetchAuditLogs(filters),
      fetchAuditMetrics(),
      fetchRecentCriticalEvents(5),
    ]);

    if (logsResult.error) {
      setError(logsResult.error);
    } else {
      setAuditLogs(logsResult.data);
      setTotalCount(logsResult.count);
    }

    if (!metricsResult.error) {
      setMetrics(metricsResult);
    }

    if (!criticalResult.error) {
      setCriticalEvents(criticalResult.data);
    }

    setLoading(false);
  };

  const refreshMetrics = async () => {
    const metricsResult = await fetchAuditMetrics();
    if (!metricsResult.error) {
      setMetrics(metricsResult);
    }
  };

  const handleFilterChange = (key: keyof AuditLogsFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDatePreset = (preset: string) => {
    const now = new Date();
    let dateFrom = '';

    switch (preset) {
      case 'today':
        dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case 'week':
        dateFrom = new Date(now.setDate(now.getDate() - 7)).toISOString();
        break;
      case 'month':
        dateFrom = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        break;
      default:
        dateFrom = '';
    }

    setFilters((prev) => ({ ...prev, dateFrom, dateTo: new Date().toISOString(), page: 1 }));
  };

  const handleExport = () => {
    const csv = exportAuditLogsToCSV(auditLogs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    setSyncValidationError('Reconnecting...');

    try {
      await reconnectRealtimeChannels();
      setSyncValidationError(null);
    } catch (error: any) {
      setSyncValidationError(error?.message || 'Reconnection failed');
    } finally {
      setIsReconnecting(false);
    }
  };

  const getConnectionStatusColor = () => {
    if (!connectionHealth) return 'bg-gray-400';

    switch (connectionHealth.status) {
      case 'HEALTHY': case'CONNECTED':
        return 'bg-green-500 animate-pulse';
      case 'CONNECTING': case'RECONNECTING':
        return 'bg-yellow-500 animate-pulse';
      case 'ERROR': case'DISCONNECTED':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getConnectionStatusText = () => {
    if (!connectionHealth) return 'Initializing...';

    switch (connectionHealth.status) {
      case 'HEALTHY':
        return 'Live & Healthy';
      case 'CONNECTED':
        return 'Connected';
      case 'CONNECTING':
        return 'Connecting...';
      case 'RECONNECTING':
        return `Reconnecting (${connectionHealth.reconnectAttempts}/5)`;
      case 'ERROR':
        return 'Connection Error';
      case 'DISCONNECTED':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getSeverityBadge = (severity?: string) => {
    const color = getSeverityColor(severity);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {severity?.toUpperCase() || 'INFO'}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / (filters.pageSize || 20));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader
          userName="Admin User"
          userRole="Super Admin"
        />

        <main className="p-6">
          <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive system activity tracking with real-time monitoring
            </p>
          </div>

          {/* Enhanced Real-time Status Indicator */}
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    {getConnectionStatusText()}
                  </span>
                  {connectionHealth?.lastSuccessfulSync && (
                    <span className="text-xs text-gray-500">
                      Last sync: {new Date(connectionHealth.lastSuccessfulSync).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {liveUpdateCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    +{liveUpdateCount}
                  </span>
                )}
              </div>

              {/* Connection Details */}
              {connectionHealth && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                  <div>Active channels: {connectionHealth.channelCount}</div>
                  {connectionHealth.lastError && (
                    <div className="text-red-600">Error: {connectionHealth.lastError}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  realtimeEnabled
                    ? 'bg-green-600 text-white hover:bg-green-700' :'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {realtimeEnabled ? '🔴 Live' : '⏸️ Paused'}
              </button>

              <button
                onClick={handleManualReconnect}
                disabled={isReconnecting || !realtimeEnabled}
                className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {isReconnecting ? '🔄 Reconnecting...' : '🔄 Reconnect'}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Validation Error Banner */}
        {syncValidationError && (
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 rounded">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">⚠️ Connection Issue</p>
                <p className="text-sm mt-1">{syncValidationError}</p>
              </div>
              <button
                onClick={handleManualReconnect}
                disabled={isReconnecting}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:bg-gray-400"
              >
                Retry
              </button>
            </div>
          </div>
        )}
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Date Range Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleDatePreset('today')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                Today
              </button>
              <button
                onClick={() => handleDatePreset('week')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                Week
              </button>
              <button
                onClick={() => handleDatePreset('month')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                Month
              </button>
            </div>
          </div>

          {/* Activity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Type
            </label>
            <select
              value={filters.activityType}
              onChange={(e) => handleFilterChange('activityType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Activities</option>
              <option value="INSERT">System Changes</option>
              <option value="UPDATE">User Actions</option>
              <option value="DELETE">Staff Operations</option>
              <option value="system_settings">Configuration Updates</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity Level
            </label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search by table, action..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={auditLogs.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            📥 Export to CSV
          </button>
        </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <MetricCard
          title="Total Events"
          value={metrics.totalEvents}
          icon="📊"
        />
        <MetricCard
          title="Critical Alerts"
          value={metrics.criticalAlerts}
          icon="🚨"
        />
        <MetricCard
          title="Failed Operations"
          value={metrics.failedOperations}
          icon="❌"
        />
        <MetricCard
          title="Unique Actors"
          value={metrics.uniqueActors}
          icon="👥"
        />
        <MetricCard
          title="System Modifications"
          value={metrics.systemModifications}
          icon="⚙️"
        />
        <MetricCard
          title="Compliance Violations"
          value={metrics.complianceViolations}
          icon="⚖️"
        />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Audit Trail Table (9 cols) */}
              <div className="lg:col-span-9">
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Audit Trail</h2>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p className="font-medium">Error loading audit logs</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">Loading audit logs...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 text-lg">No audit logs found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your filters or date range
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.user_id || 'System'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.table_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getSeverityBadge(log.severity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() =>
                                setExpandedRow(expandedRow === log.id ? null : log.id)
                              }
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {expandedRow === log.id ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        {expandedRow === log.id && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium text-gray-700">Record ID:</span>
                                  <span className="ml-2 text-gray-600 text-sm">{log.record_id}</span>
                                </div>
                                {log.changes && (
                                  <div>
                                    <span className="font-medium text-gray-700">Changes:</span>
                                    <pre className="mt-2 p-3 bg-white rounded border border-gray-200 text-xs overflow-auto max-h-40">
                                      {JSON.stringify(log.changes, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((filters.page || 1) - 1) * (filters.pageSize || 20) + 1} to{' '}
                  {Math.min((filters.page || 1) * (filters.pageSize || 20), totalCount)} of{' '}
                  {totalCount} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFilterChange('page', (filters.page || 1) - 1)}
                    disabled={(filters.page || 1) === 1}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                    disabled={(filters.page || 1) === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
              </div>

              {/* Right Sidebar (3 cols) */}
              <div className="lg:col-span-3 space-y-6">
          {/* Recent Critical Events */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Critical Events
            </h3>
            <div className="space-y-3">
              {criticalEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No critical events</p>
              ) : (
                criticalEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-red-50 rounded border-l-4 border-red-500"
                  >
                    <p className="text-sm font-medium text-gray-900">{event.action}</p>
                    <p className="text-xs text-gray-600 mt-1">{event.table_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Health Indicators */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              System Health
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Authentication</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Services</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Online
                </span>
              </div>
            </div>
          </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Unified Real-time Connection Overlay */}
      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}

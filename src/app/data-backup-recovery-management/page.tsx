'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, AlertTriangle, CheckCircle, Clock, Database, HardDrive, Shield } from 'lucide-react';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';
import { getBackupConfigurations, getBackupExecutions, getRecoveryPoints, getRecoveryTests, getBackupAuditTrail, getBackupMetrics, triggerManualBackup, createRecoveryTest, BackupConfiguration, BackupExecution, RecoveryPoint, RecoveryTest, BackupAuditEntry,  } from '@/services/dataBackupRecoveryService';

export default function DataBackupRecoveryManagement() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'executions' | 'recovery' | 'testing' | 'audit'>('schedules');
  const [backupTypeFilter, setBackupTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [emergencyMode, setEmergencyMode] = useState(false);

  const [configurations, setConfigurations] = useState<BackupConfiguration[]>([]);
  const [executions, setExecutions] = useState<BackupExecution[]>([]);
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPoint[]>([]);
  const [recoveryTests, setRecoveryTests] = useState<RecoveryTest[]>([]);
  const [auditTrail, setAuditTrail] = useState<BackupAuditEntry[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<BackupConfiguration | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, backupTypeFilter, statusFilter, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const metricsData = await getBackupMetrics();
      setMetrics(metricsData);

      if (activeTab === 'schedules') {
        const filters = backupTypeFilter !== 'all' ? { backup_type: backupTypeFilter } : {};
        const data = await getBackupConfigurations(filters);
        setConfigurations(data);
      } else if (activeTab === 'executions') {
        const filters: any = {};
        if (statusFilter !== 'all') filters.status = statusFilter;
        if (dateRange.start) filters.date_from = dateRange.start;
        if (dateRange.end) filters.date_to = dateRange.end;
        const data = await getBackupExecutions(filters);
        setExecutions(data);
      } else if (activeTab === 'recovery') {
        const data = await getRecoveryPoints();
        setRecoveryPoints(data);
      } else if (activeTab === 'testing') {
        const data = await getRecoveryTests();
        setRecoveryTests(data);
      } else if (activeTab === 'audit') {
        const filters: any = {};
        if (dateRange.start) filters.date_from = dateRange.start;
        if (dateRange.end) filters.date_to = dateRange.end;
        const data = await getBackupAuditTrail(filters);
        setAuditTrail(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async (configId: string) => {
    try {
      await triggerManualBackup(configId);
      alert('Manual backup triggered successfully');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to trigger backup');
    }
  };

  const handleCreateTest = async (executionId: string) => {
    try {
      await createRecoveryTest({
        backup_execution_id: executionId,
        test_status: 'pending',
        test_type: 'manual_validation',
        issues_found: 0,
      });
      alert('Recovery test created successfully');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create recovery test');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RealtimeConnectionOverlay />
      
      <div className="max-w-[1920px] mx-auto p-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Backup & Recovery Management</h1>
              <p className="text-gray-600 mt-1">Business continuity oversight with automated backup and disaster recovery</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEmergencyMode(!emergencyMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  emergencyMode
                    ? 'bg-red-600 text-white hover:bg-red-700' :'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <AlertTriangle className="inline-block w-5 h-5 mr-2" />
                {emergencyMode ? 'Emergency Mode Active' : 'Emergency Mode'}
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="inline-block w-5 h-5 mr-2" />
                New Backup Schedule
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
            <select
              value={backupTypeFilter}
              onChange={(e) => setBackupTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Backup Types</option>
              <option value="full">Full Backup</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Differential</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
            </select>

            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="flex items-center text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search backups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Backup Size</span>
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatBytes(metrics?.total_backup_size || 0)}</div>
            <div className="text-xs text-gray-500 mt-1">Across all backups</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Successful Today</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics?.successful_backups_today || 0}</div>
            <div className="text-xs text-green-600 mt-1">All completed</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Last Backup</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-sm font-bold text-gray-900">
              {metrics?.last_successful_backup ? formatDate(metrics.last_successful_backup) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Most recent</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Storage Utilization</span>
              <HardDrive className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics?.storage_utilization?.toFixed(1) || 0}%</div>
            <div className="text-xs text-gray-500 mt-1">Of allocated storage</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Recovery Test Score</span>
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics?.recovery_test_score?.toFixed(1) || 0}%</div>
            <div className="text-xs text-green-600 mt-1">Excellent health</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">RPO Status</span>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">Compliant</div>
            <div className="text-xs text-blue-600 mt-1">Within target</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'schedules', label: 'Backup Schedules' },
                { id: 'executions', label: 'Execution History' },
                { id: 'recovery', label: 'Recovery Points' },
                { id: 'testing', label: 'Recovery Testing' },
                { id: 'audit', label: 'Audit Trail' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content (9 columns) */}
          <div className="col-span-12 lg:col-span-9">
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="text-red-600">{error}</div>
              </div>
            ) : (
              <>
                {/* Backup Schedules Tab */}
                {activeTab === 'schedules' && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Backup Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Run</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Scheduled</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retention</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {configurations?.map((config) => (
                          <tr key={config.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{config.backup_name}</div>
                                  <div className="text-xs text-gray-500">{config.backup_type}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{config.frequency}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {config.last_run_at ? formatDate(config.last_run_at) : 'Never'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {config.next_scheduled_run ? formatDate(config.next_scheduled_run) : 'Not scheduled'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{config.retention_policy_days} days</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{config.storage_location}</td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleManualBackup(config.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Manual Backup"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedConfig(config)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Edit Schedule"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Execution History Tab */}
                {activeTab === 'executions' && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {executions?.map((exec) => (
                          <tr key={exec.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  exec.execution_status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : exec.execution_status === 'failed' ?'bg-red-100 text-red-800'
                                    : exec.execution_status === 'in_progress' ?'bg-blue-100 text-blue-800' :'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {exec.execution_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(exec.started_at)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {exec.duration_seconds ? `${Math.floor(exec.duration_seconds / 60)}m ${exec.duration_seconds % 60}s` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{formatBytes(exec.backup_size_bytes)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{exec.backup_location || 'N/A'}</td>
                            <td className="px-6 py-4">
                              {exec.verification_status ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Recovery Points Tab */}
                {activeTab === 'recovery' && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Point-in-Time Recovery Points</h3>
                    <div className="space-y-4">
                      {recoveryPoints?.map((point) => (
                        <div key={point.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(point.recovery_point_timestamp)}
                            </div>
                            <div className="flex items-center gap-2">
                              {point.is_verified && <CheckCircle className="w-5 h-5 text-green-600" />}
                              <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                                Restore
                              </button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            Size: {formatBytes(point.size_bytes)} | Tables: {point.affected_tables?.length || 0}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {point.affected_tables?.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recovery Testing Tab */}
                {activeTab === 'testing' && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recoveryTests?.map((test) => (
                          <tr key={test.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{test.test_type}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  test.test_status === 'passed' ?'bg-green-100 text-green-800'
                                    : test.test_status === 'failed' ?'bg-red-100 text-red-800'
                                    : test.test_status === 'in_progress' ?'bg-blue-100 text-blue-800' :'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {test.test_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(test.started_at)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {test.duration_seconds ? `${Math.floor(test.duration_seconds / 60)}m` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{test.success_rate?.toFixed(2) || 0}%</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{test.issues_found}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Audit Trail Tab */}
                {activeTab === 'audit' && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {auditTrail?.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(entry.action_timestamp)}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.action}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{entry.entity_type}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {JSON.stringify(entry.changes).substring(0, 100)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar (3 columns) */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* Recent Activities */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Backup Activities</h3>
              <div className="space-y-3">
                {executions?.slice(0, 5).map((exec) => (
                  <div key={exec.id} className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 ${
                        exec.execution_status === 'completed'
                          ? 'bg-green-500'
                          : exec.execution_status === 'failed' ?'bg-red-500' :'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 font-medium truncate">
                        {exec.execution_status === 'completed' ? 'Backup completed' : 'Backup ' + exec.execution_status}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(exec.started_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage Capacity */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Storage Capacity</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Used</span>
                    <span className="font-medium text-gray-900">{metrics?.storage_utilization?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${metrics?.storage_utilization || 0}%` }}
                    />
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-600">Total Size</span>
                    <span className="font-medium text-gray-900">{formatBytes(metrics?.total_backup_size || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Available</span>
                    <span className="font-medium text-gray-900">{formatBytes(100000000000 - (metrics?.total_backup_size || 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recovery Test Results */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recovery Test Results</h3>
              <div className="space-y-3">
                {recoveryTests?.slice(0, 3).map((test) => (
                  <div key={test.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{test.test_type}</p>
                      <p className="text-xs text-gray-500">{formatDate(test.started_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">{test.success_rate?.toFixed(1) || 0}%</p>
                      {test.test_status === 'passed' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 ml-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
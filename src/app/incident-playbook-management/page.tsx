'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchIncidentPlaybooks,
  fetchPlaybooksByCategory,
  fetchPlaybooksBySeverity,
  fetchPlaybooksByStatus,
  fetchRecentPlaybookActivations,
  type IncidentPlaybook,
  type PlaybookCategory,
  type PlaybookStatus
} from '@/services/incidentPlaybookService';

export default function IncidentPlaybookManagement() {
  const [playbooks, setPlaybooks] = useState<IncidentPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PlaybookCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<PlaybookStatus | 'all'>('all');
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);
  const [recentActivations, setRecentActivations] = useState<any[]>([]);

  useEffect(() => {
    loadPlaybooks();
    loadRecentActivations();
  }, [selectedCategory, selectedSeverity, selectedStatus]);

  const loadPlaybooks = async () => {
    try {
      setLoading(true);
      let data: IncidentPlaybook[];

      if (selectedCategory !== 'all') {
        data = await fetchPlaybooksByCategory(selectedCategory);
      } else if (selectedSeverity !== 'all') {
        data = await fetchPlaybooksBySeverity(selectedSeverity);
      } else if (selectedStatus !== 'all') {
        data = await fetchPlaybooksByStatus(selectedStatus);
      } else {
        data = await fetchIncidentPlaybooks();
      }

      setPlaybooks(data);
    } catch (error) {
      console.error('Failed to load playbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivations = async () => {
    try {
      let data = await fetchRecentPlaybookActivations(5);
      setRecentActivations(data || []);
    } catch (error) {
      console.error('Failed to load recent activations:', error);
    }
  };

  const getCategoryColor = (category: PlaybookCategory) => {
    const colors = {
      security: 'bg-red-100 text-red-800',
      technical: 'bg-blue-100 text-blue-800',
      operational: 'bg-green-100 text-green-800',
      compliance: 'bg-purple-100 text-purple-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-600 text-white',
      medium: 'bg-yellow-600 text-white',
      low: 'bg-green-600 text-white'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-600 text-white';
  };

  const getStatusColor = (status: PlaybookStatus) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      archived: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const togglePlaybookExpansion = (playbookId: string) => {
    setExpandedPlaybook(expandedPlaybook === playbookId ? null : playbookId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Incident Playbook Management</h1>
        <p className="text-gray-600">
          Create and manage reusable incident response playbooks with predefined escalation paths, task templates, and communication scripts
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Total Active Playbooks</div>
          <div className="text-2xl font-bold text-gray-900">
            {playbooks.filter(p => p.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Recent Usage Count</div>
          <div className="text-2xl font-bold text-blue-600">
            {playbooks.reduce((sum, p) => sum + (p.usage_count || 0), 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Avg Resolution Time</div>
          <div className="text-2xl font-bold text-green-600">
            {Math.round(
              playbooks.reduce((sum, p) => sum + (p.estimated_resolution_time_minutes || 0), 0) / 
              (playbooks.length || 1)
            )} min
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Avg Effectiveness</div>
          <div className="text-2xl font-bold text-purple-600">
            {(
              playbooks.reduce((sum, p) => sum + (p.effectiveness_score || 0), 0) / 
              (playbooks.filter(p => p.effectiveness_score).length || 1)
            ).toFixed(1)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Security Playbooks</div>
          <div className="text-2xl font-bold text-red-600">
            {playbooks.filter(p => p.playbook_category === 'security').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Compliance Coverage</div>
          <div className="text-2xl font-bold text-indigo-600">98%</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category Filter</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PlaybookCategory | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="security">Security</option>
              <option value="technical">Technical</option>
              <option value="operational">Operational</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity Filter</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">P0 - Critical</option>
              <option value="high">P1 - High</option>
              <option value="medium">P2 - Medium</option>
              <option value="low">P3 - Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PlaybookStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
              <option value="under_review">Under Review</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Create New Playbook
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Playbook Library */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Playbook Library</h2>
              <p className="text-sm text-gray-500 mt-1">
                {playbooks.length} playbook{playbooks.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading playbooks...</div>
            ) : playbooks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No playbooks found. Create your first playbook to get started.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {playbooks.map((playbook) => (
                  <div key={playbook.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {playbook.playbook_name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(playbook.playbook_category)}`}>
                            {playbook.playbook_category}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(playbook.severity_level)}`}>
                            {playbook.severity_level}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(playbook.status)}`}>
                            {playbook.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{playbook.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-500">Usage Count</div>
                        <div className="text-sm font-semibold text-gray-900">{playbook.usage_count || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Effectiveness</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {playbook.effectiveness_score?.toFixed(1) || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Est. Time</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {playbook.estimated_resolution_time_minutes || 0} min
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Version</div>
                        <div className="text-sm font-semibold text-gray-900">v{playbook.version}</div>
                      </div>
                    </div>

                    {playbook.tags && playbook.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {playbook.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePlaybookExpansion(playbook.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedPlaybook === playbook.id ? '▼' : '▶'} View Details
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Edit
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Duplicate
                      </button>
                      <button className="text-sm text-green-600 hover:text-green-800 font-medium">
                        Activate
                      </button>
                      <button className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                        Test Simulation
                      </button>
                    </div>

                    {expandedPlaybook === playbook.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Escalation Matrix</h4>
                            <div className="text-sm text-gray-600">
                              • Level 1: Team Lead (15 min)
                              <br />
                              • Level 2: Department Manager (30 min)
                              <br />
                              • Level 3: Executive Team (1 hour)
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Task Checklist</h4>
                            <div className="text-sm text-gray-600">
                              ✓ Initial assessment
                              <br />
                              ✓ Containment actions
                              <br />
                              ✓ Communication
                              <br />
                              ✓ Resolution & review
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Communication Scripts</h4>
                            <div className="text-sm text-gray-600">
                              • Internal team notification
                              <br />
                              • Stakeholder update
                              <br />
                              • Post-incident report
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activations */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activations</h3>
            </div>
            <div className="p-4 space-y-3">
              {recentActivations?.slice(0, 5).map((activation: any) => (
                <div key={activation.id} className="pb-3 border-b border-gray-100 last:border-0">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {activation.incident_playbooks?.playbook_name || 'Unknown Playbook'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activation.activated_at).toLocaleDateString()}
                  </div>
                  {activation.effectiveness_rating && (
                    <div className="text-xs text-green-600 mt-1">
                      ⭐ {activation.effectiveness_rating}/5.0
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Effectiveness Analytics */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Effectiveness Analytics</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Security Playbooks</span>
                    <span className="font-semibold">4.6/5.0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Technical Playbooks</span>
                    <span className="font-semibold">4.4/5.0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Operational Playbooks</span>
                    <span className="font-semibold">4.2/5.0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Validation */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Compliance Validation</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">GDPR Coverage</span>
                  <span className="text-sm font-semibold text-green-600">✓ 100%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">HIPAA Coverage</span>
                  <span className="text-sm font-semibold text-green-600">✓ 100%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">SOC2 Coverage</span>
                  <span className="text-sm font-semibold text-green-600">✓ 95%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">ISO 27001 Coverage</span>
                  <span className="text-sm font-semibold text-yellow-600">⚠ 89%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
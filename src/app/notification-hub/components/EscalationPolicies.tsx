'use client';

import React, { useState, useEffect } from 'react';
import { escalationWorkflowService } from '@/services/escalationWorkflowService';

export function EscalationPolicies() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [workflowsData, thresholdsData] = await Promise.all([
        escalationWorkflowService.getAllWorkflows(),
        escalationWorkflowService.getAllThresholds(),
      ]);
      setWorkflows(workflowsData || []);
      setThresholds(thresholdsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load escalation data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
        <div className="animate-spin text-4xl mb-4">⟳</div>
        <p className="text-gray-300">Loading escalation policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Escalation Workflows */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Escalation Workflows</h2>
            <p className="text-gray-300 text-sm">Automated escalation paths for different alert severities</p>
          </div>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            + New Workflow
          </button>
        </div>

        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔄</div>
            <p className="text-gray-400">No escalation workflows configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="p-4 bg-white/5 border border-white/20 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{workflow.workflow_name}</h3>
                    {workflow.description && (
                      <p className="text-sm text-gray-400">{workflow.description}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    workflow.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {workflow.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Escalation Steps */}
                {workflow.escalation_steps && (
                  <div className="space-y-2">
                    {workflow.escalation_steps.map((step: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {step.step_order}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{step.action_type}</div>
                          <div className="text-xs text-gray-400">
                            Delay: {step.delay_minutes} min | Target: {step.target_role || 'All Admins'}
                          </div>
                        </div>
                        <div className="text-gray-400 text-sm">
                          {step.notification_template || 'Default Template'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Escalation Thresholds */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Escalation Thresholds</h2>
            <p className="text-gray-300 text-sm">Define when alerts should trigger escalation workflows</p>
          </div>
          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            + Add Threshold
          </button>
        </div>

        {thresholds.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-gray-400">No escalation thresholds configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {thresholds.map((threshold) => (
              <div key={threshold.id} className="p-4 bg-white/5 border border-white/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(threshold.severity)}`}></div>
                    <span className="text-white font-medium capitalize">{threshold.severity}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    threshold.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {threshold.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trigger Condition:</span>
                    <span className="text-white">{threshold.trigger_condition}</span>
                  </div>
                  {threshold.max_retries && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Retries:</span>
                      <span className="text-white">{threshold.max_retries}</span>
                    </div>
                  )}
                  {threshold.retry_interval_minutes && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Retry Interval:</span>
                      <span className="text-white">{threshold.retry_interval_minutes} min</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-xs text-gray-400">
                    Workflow: {threshold.escalation_workflow_id ? 'Assigned' : 'None'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policy Performance */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">Policy Performance Metrics</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
            <div className="text-3xl font-bold text-white mb-1">24</div>
            <div className="text-sm text-gray-300">Total Escalations (24h)</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-lg">
            <div className="text-3xl font-bold text-white mb-1">18</div>
            <div className="text-sm text-gray-300">Auto-Resolved</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg">
            <div className="text-3xl font-bold text-white mb-1">6</div>
            <div className="text-sm text-gray-300">Manual Intervention</div>
          </div>
        </div>
      </div>
    </div>
  );
}
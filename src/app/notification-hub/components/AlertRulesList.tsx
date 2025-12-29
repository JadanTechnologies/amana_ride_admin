'use client';

import React, { useState, useEffect } from 'react';
import { notificationRulesService } from '@/services/notificationRulesService';

interface AlertRulesListProps {
  onEditRule: (rule: any) => void;
}

export function AlertRulesList({ onEditRule }: AlertRulesListProps) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationRulesService.getAllRules();
      setRules(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (ruleId: string, currentState: boolean) => {
    try {
      await notificationRulesService.updateRule(ruleId, { is_active: !currentState });
      await loadRules();
    } catch (err: any) {
      setError(err.message || 'Failed to update rule status');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) {
      return;
    }

    try {
      await notificationRulesService.deleteRule(ruleId);
      await loadRules();
    } catch (err: any) {
      setError(err.message || 'Failed to delete rule');
    }
  };

  const filteredRules = rules.filter(rule => {
    if (filter === 'active' && !rule.is_active) return false;
    if (filter === 'inactive' && rule.is_active) return false;
    if (severityFilter !== 'all' && rule.severity !== severityFilter) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-400 bg-blue-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'critical': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getConditionsSummary = (conditions: any) => {
    if (!conditions) return 'No conditions';
    const keys = Object.keys(conditions);
    return `${keys.length} condition${keys.length !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
        <div className="animate-spin text-4xl mb-4">⟳</div>
        <p className="text-gray-300">Loading alert rules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              All Rules
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'active' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'inactive' ? 'bg-gray-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Inactive
            </button>
          </div>

          <div className="flex-1"></div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Alert Rules Found</h3>
          <p className="text-gray-400">
            {filter !== 'all' 
              ? `No ${filter} rules match your filters`
              : 'Create your first alert rule to start monitoring your system'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{rule.rule_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                      {rule.severity}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      rule.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {rule.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>

                  {rule.description && (
                    <p className="text-gray-300 text-sm mb-3">{rule.description}</p>
                  )}

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>⚡</span>
                      <span>{getConditionsSummary(rule.conditions)}</span>
                    </div>
                    {rule.notification_channels && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>📢</span>
                        <span>{rule.notification_channels.length} channel{rule.notification_channels.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {rule.escalation_config && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>🚨</span>
                        <span>{rule.escalation_config.levels?.length || 0} escalation level{rule.escalation_config.levels?.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>📅</span>
                      <span>Created {new Date(rule.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.is_active)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      rule.is_active
                        ? 'bg-gray-600 hover:bg-gray-700 text-white' :'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    title={rule.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {rule.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => onEditRule(rule)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
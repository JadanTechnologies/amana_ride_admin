'use client';

import React, { useState, useEffect } from 'react';
import { notificationRulesService } from '@/services/notificationRulesService';

interface Condition {
  id: string;
  metric: string;
  operator: string;
  threshold: string;
  timeWindow: string;
}

interface NotificationChannel {
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

interface EscalationLevel {
  id: string;
  level: number;
  delayMinutes: number;
  channels: string[];
}

interface AlertRuleBuilderProps {
  rule?: any;
  onClose: () => void;
  onSave: () => void;
}

export function AlertRuleBuilder({ rule, onClose, onSave }: AlertRuleBuilderProps) {
  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([
    { type: 'email', enabled: true, config: {} },
    { type: 'slack', enabled: false, config: {} },
    { type: 'sms', enabled: false, config: {} },
    { type: 'webhook', enabled: false, config: {} },
  ]);
  const [escalationLevels, setEscalationLevels] = useState<EscalationLevel[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metricOptions = [
    { value: 'sync_failure_rate', label: 'Sync Failure Rate (%)' },
    { value: 'connection_drops', label: 'Connection Drops Count' },
    { value: 'retry_queue_size', label: 'Retry Queue Size' },
    { value: 'checksum_failures', label: 'Checksum Failures Count' },
    { value: 'conflict_resolution_time', label: 'Conflict Resolution Time (ms)' },
    { value: 'data_latency', label: 'Data Latency (seconds)' },
    { value: 'error_rate', label: 'Error Rate (%)' },
    { value: 'response_time', label: 'Response Time (ms)' },
  ];

  const operatorOptions = [
    { value: 'gt', label: 'Greater Than (>)' },
    { value: 'gte', label: 'Greater Than or Equal (≥)' },
    { value: 'lt', label: 'Less Than (<)' },
    { value: 'lte', label: 'Less Than or Equal (≤)' },
    { value: 'eq', label: 'Equal To (=)' },
  ];

  const timeWindowOptions = [
    { value: '1m', label: '1 minute' },
    { value: '5m', label: '5 minutes' },
    { value: '15m', label: '15 minutes' },
    { value: '30m', label: '30 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '24h', label: '24 hours' },
  ];

  useEffect(() => {
    if (rule) {
      setRuleName(rule.rule_name || '');
      setDescription(rule.description || '');
      setSeverity(rule.severity || 'medium');
      setIsActive(rule.is_active ?? true);
      
      // Parse conditions from rule
      if (rule.conditions) {
        const parsedConditions = Object.entries(rule.conditions).map(([key, value]: [string, any], index) => ({
          id: `condition-${index}`,
          metric: key,
          operator: value.operator || 'gt',
          threshold: value.threshold?.toString() || '',
          timeWindow: value.time_window || '5m',
        }));
        setConditions(parsedConditions);
      }

      // Parse notification channels
      if (rule.notification_channels) {
        const channels = rule.notification_channels.map((ch: string) => ({
          type: ch,
          enabled: true,
          config: {},
        }));
        setNotificationChannels(prev => 
          prev.map(channel => ({
            ...channel,
            enabled: channels.some((ch: any) => ch.type === channel.type),
          }))
        );
      }
    } else {
      // Add default condition for new rules
      addCondition();
    }
  }, [rule]);

  const addCondition = () => {
    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      metric: 'sync_failure_rate',
      operator: 'gt',
      threshold: '',
      timeWindow: '5m',
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, field: keyof Condition, value: string) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const toggleChannel = (type: string) => {
    setNotificationChannels(channels =>
      channels.map(ch => 
        ch.type === type ? { ...ch, enabled: !ch.enabled } : ch
      )
    );
  };

  const addEscalationLevel = () => {
    const newLevel: EscalationLevel = {
      id: `escalation-${Date.now()}`,
      level: escalationLevels.length + 1,
      delayMinutes: 15,
      channels: ['email'],
    };
    setEscalationLevels([...escalationLevels, newLevel]);
  };

  const removeEscalationLevel = (id: string) => {
    setEscalationLevels(levels => levels.filter(l => l.id !== id));
  };

  const updateEscalationLevel = (id: string, field: keyof EscalationLevel, value: any) => {
    setEscalationLevels(levels =>
      levels.map(l => 
        l.id === id ? { ...l, [field]: value } : l
      )
    );
  };

  const handleSave = async () => {
    // Validation
    if (!ruleName.trim()) {
      setError('Rule name is required');
      return;
    }

    if (conditions.length === 0) {
      setError('At least one condition is required');
      return;
    }

    const invalidConditions = conditions.filter(c => !c.threshold || isNaN(Number(c.threshold)));
    if (invalidConditions.length > 0) {
      setError('All conditions must have valid numeric thresholds');
      return;
    }

    const enabledChannels = notificationChannels.filter(ch => ch.enabled);
    if (enabledChannels.length === 0) {
      setError('At least one notification channel must be enabled');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Prepare conditions object
      const conditionsObj = conditions.reduce((acc, condition) => {
        acc[condition.metric] = {
          operator: condition.operator,
          threshold: Number(condition.threshold),
          time_window: condition.timeWindow,
        };
        return acc;
      }, {} as Record<string, any>);

      // Prepare escalation config
      const escalationConfig = escalationLevels.length > 0 ? {
        levels: escalationLevels.map(level => ({
          level: level.level,
          delay_minutes: level.delayMinutes,
          channels: level.channels,
        })),
      } : null;

      const ruleData = {
        rule_name: ruleName,
        description: description || null,
        severity,
        conditions: conditionsObj,
        notification_channels: enabledChannels.map(ch => ch.type),
        escalation_config: escalationConfig,
        is_active: isActive,
      };

      if (rule?.id) {
        await notificationRulesService.updateRule(rule.id, ruleData);
      } else {
        await notificationRulesService.createRule(ruleData);
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save alert rule');
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          {rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-2xl">×</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Rule Name *
            </label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., High Sync Failure Rate Alert"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe when this rule should trigger..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Severity Level
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setSeverity(level)}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    severity === level
                      ? level === 'low' ? 'bg-blue-500 text-white'
                      : level === 'medium' ? 'bg-yellow-500 text-white'
                      : level === 'high'? 'bg-orange-500 text-white' :'bg-red-500 text-white' :'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded bg-white/5 border-white/20"
            />
            <label htmlFor="isActive" className="text-gray-200">
              Active (rule will trigger alerts)
            </label>
          </div>
        </div>

        {/* Threshold Conditions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Threshold Conditions</h3>
            <button
              onClick={addCondition}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              + Add Condition
            </button>
          </div>

          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div
                key={condition.id}
                className="p-4 bg-white/5 border border-white/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Metric</label>
                      <select
                        value={condition.metric}
                        onChange={(e) => updateCondition(condition.id, 'metric', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {metricOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Operator</label>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {operatorOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Threshold</label>
                      <input
                        type="number"
                        value={condition.threshold}
                        onChange={(e) => updateCondition(condition.id, 'threshold', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Time Window</label>
                      <select
                        value={condition.timeWindow}
                        onChange={(e) => updateCondition(condition.id, 'timeWindow', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {timeWindowOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => removeCondition(condition.id)}
                    className="mt-6 text-red-400 hover:text-red-300 transition-colors"
                    title="Remove condition"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>

                {index < conditions.length - 1 && (
                  <div className="mt-3 text-center">
                    <span className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-xs font-medium">
                      AND
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notification Channels */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Notification Channels</h3>
          <div className="grid grid-cols-2 gap-4">
            {notificationChannels.map((channel) => (
              <div
                key={channel.type}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  channel.enabled
                    ? 'border-purple-500 bg-purple-500/10' :'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => toggleChannel(channel.type)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      channel.enabled ? 'bg-purple-500' : 'bg-white/10'
                    }`}>
                      <span className="text-xl">
                        {channel.type === 'email' ? '📧' :
                         channel.type === 'slack' ? '💬' :
                         channel.type === 'sms' ? '📱' : '🔗'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white capitalize">{channel.type}</div>
                      <div className="text-xs text-gray-400">
                        {channel.enabled ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={() => {}}
                    className="w-5 h-5"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Escalation Policies */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Escalation Policy</h3>
              <p className="text-sm text-gray-400">Define progressive escalation levels</p>
            </div>
            <button
              onClick={addEscalationLevel}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              + Add Level
            </button>
          </div>

          {escalationLevels.length > 0 ? (
            <div className="space-y-3">
              {escalationLevels.map((level) => (
                <div
                  key={level.id}
                  className="p-4 bg-white/5 border border-white/20 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">
                        L{level.level}
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Delay (minutes)
                        </label>
                        <input
                          type="number"
                          value={level.delayMinutes}
                          onChange={(e) => updateEscalationLevel(level.id, 'delayMinutes', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Channels
                        </label>
                        <select
                          multiple
                          value={level.channels}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            updateEscalationLevel(level.id, 'channels', selected);
                          }}
                          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {notificationChannels.filter(ch => ch.enabled).map(ch => (
                            <option key={ch.type} value={ch.type}>{ch.type}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => removeEscalationLevel(level.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Remove level"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white/5 border border-white/20 rounded-lg border-dashed">
              <p className="text-gray-400">No escalation levels defined</p>
              <p className="text-sm text-gray-500 mt-1">Click "Add Level" to create escalation policy</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⟳</span>
                Saving...
              </>
            ) : (
              <>
                <span>💾</span>
                {rule ? 'Update Rule' : 'Create Rule'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
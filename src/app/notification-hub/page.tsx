'use client';

import React, { useState, useEffect } from 'react';
import { AlertRuleBuilder } from './components/AlertRuleBuilder';
import { AlertRulesList } from './components/AlertRulesList';
import { NotificationChannelsConfig } from './components/NotificationChannelsConfig';
import { EscalationPolicies } from './components/EscalationPolicies';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';

export default function NotificationHubPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'channels' | 'escalation'>('rules');
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const { isConnected, connectionQuality } = useRealtimeConnection();

  const tabs = [
    { id: 'rules', label: 'Alert Rules', icon: '⚡' },
    { id: 'channels', label: 'Notification Channels', icon: '📢' },
    { id: 'escalation', label: 'Escalation Policies', icon: '🚨' },
  ];

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowRuleBuilder(true);
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setShowRuleBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowRuleBuilder(false);
    setEditingRule(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <RealtimeConnectionOverlay isConnected={isConnected} quality={connectionQuality} />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Notification Hub</h1>
            <p className="text-purple-200">Configure alert rules, notification channels, and escalation policies</p>
          </div>
          {activeTab === 'rules' && !showRuleBuilder && (
            <button
              onClick={handleCreateRule}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
            >
              <span className="text-xl">+</span>
              Create Alert Rule
            </button>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
          <span className="text-gray-300">
            {isConnected ? `Connected (${connectionQuality})` : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white text-purple-900 shadow-lg'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'rules' && (
          <>
            {showRuleBuilder ? (
              <AlertRuleBuilder
                rule={editingRule}
                onClose={handleCloseBuilder}
                onSave={() => {
                  handleCloseBuilder();
                }}
              />
            ) : (
              <AlertRulesList onEditRule={handleEditRule} />
            )}
          </>
        )}

        {activeTab === 'channels' && <NotificationChannelsConfig />}

        {activeTab === 'escalation' && <EscalationPolicies />}
      </div>
    </div>
  );
}
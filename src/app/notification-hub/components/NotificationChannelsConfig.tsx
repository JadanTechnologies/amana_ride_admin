'use client';

import React, { useState } from 'react';

interface ChannelConfig {
  id: string;
  type: string;
  name: string;
  icon: string;
  enabled: boolean;
  config: Record<string, any>;
}

export function NotificationChannelsConfig() {
  const [channels, setChannels] = useState<ChannelConfig[]>([
    {
      id: 'email',
      type: 'email',
      name: 'Email',
      icon: '📧',
      enabled: true,
      config: {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        from_address: 'alerts@amanaride.com',
      },
    },
    {
      id: 'slack',
      type: 'slack',
      name: 'Slack',
      icon: '💬',
      enabled: true,
      config: {
        webhook_url: 'https://hooks.slack.com/services/...',
        channel: '#alerts',
      },
    },
    {
      id: 'sms',
      type: 'sms',
      name: 'SMS',
      icon: '📱',
      enabled: false,
      config: {
        provider: 'twilio',
        account_sid: '',
        auth_token: '',
      },
    },
    {
      id: 'webhook',
      type: 'webhook',
      name: 'Custom Webhook',
      icon: '🔗',
      enabled: false,
      config: {
        url: '',
        method: 'POST',
        headers: {},
      },
    },
  ]);

  const [editingChannel, setEditingChannel] = useState<string | null>(null);

  const toggleChannel = (id: string) => {
    setChannels(channels.map(ch => 
      ch.id === id ? { ...ch, enabled: !ch.enabled } : ch
    ));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">Configure Notification Channels</h2>
        <p className="text-gray-300 mb-6">
          Set up and manage notification delivery channels for your alert rules
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`p-6 rounded-xl border-2 transition-all ${
                channel.enabled
                  ? 'border-purple-500 bg-purple-500/10' :'border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                    channel.enabled ? 'bg-purple-500' : 'bg-white/10'
                  }`}>
                    {channel.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{channel.name}</h3>
                    <p className="text-sm text-gray-400 capitalize">{channel.type} notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleChannel(channel.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    channel.enabled
                      ? 'bg-gray-600 hover:bg-gray-700 text-white' :'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {channel.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>

              {editingChannel === channel.id ? (
                <div className="space-y-3">
                  {Object.entries(channel.config).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-1 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <input
                        type={key.includes('token') || key.includes('password') ? 'password' : 'text'}
                        value={value as string}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm"
                        placeholder={`Enter ${key}`}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setEditingChannel(null)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingChannel(null)}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(channel.config).slice(0, 2).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-gray-300 truncate ml-2">
                        {key.includes('token') || key.includes('password') ? '••••••••' : value as string}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditingChannel(channel.id)}
                    className="w-full mt-3 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Configure
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Test Notifications */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">Test Notifications</h3>
        <p className="text-gray-300 mb-4">Send test notifications to verify channel configurations</p>
        <div className="flex gap-3">
          {channels.filter(ch => ch.enabled).map(channel => (
            <button
              key={channel.id}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Test {channel.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
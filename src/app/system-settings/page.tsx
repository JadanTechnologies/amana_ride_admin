'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';
import { getSystemSettings, type SystemSetting } from '@/services/systemSettingsService';

type SettingsTab = 'general' | 'security' | 'notifications' | 'compliance' | 'branding' | 'history';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [activeTab]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSystemSettings(activeTab);
      if (result.error) {
        setError(result.error);
      } else {
        setSettings(result.data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportConfig = () => {
    try {
      const config = JSON.stringify(settings, null, 2);
      const blob = new Blob([config], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-config-${new Date().toISOString()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSuccess('Configuration exported successfully');
    } catch (err: any) {
      setError(err?.message || 'Failed to export configuration');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'compliance', label: 'Compliance', icon: '⚖️' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader
          userName="Admin User"
          userRole="System Administrator"
        />

        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                  <p className="text-gray-600 mt-1">
                    Comprehensive platform configuration and administration
                  </p>
                </div>
                <button
                  onClick={handleExportConfig}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <span>📥</span>
                  Export Configuration
                </button>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                    ✕
                  </button>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <span>{success}</span>
                  <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Navigation */}
              <div className="col-span-3 bg-white rounded-lg shadow-sm p-4">
                <div className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 font-semibold' :'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{tab.icon}</span>
                        <span className="text-sm">{tab.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Content Area */}
              <div className="col-span-9 bg-white rounded-lg shadow-sm p-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      {tabs.find(t => t.id === activeTab)?.label} Settings
                    </h2>
                    <div className="space-y-4">
                      {settings
                        .filter(s => s.category === activeTab)
                        .map((setting) => (
                          <div key={setting.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-gray-900">{setting.display_name}</h3>
                                {setting.description && (
                                  <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      {settings.filter(s => s.category === activeTab).length === 0 && (
                        <p className="text-gray-500">No settings found for this category.</p>
                      )}
                    </div>
                  </div>
                )}
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

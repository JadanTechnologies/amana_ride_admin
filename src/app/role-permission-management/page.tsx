'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';
import { rolePermissionService } from '@/services/rolePermissionService';
import type { RoleWithPermissions } from '@/types/staff.types';

export default function RolePermissionManagement() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rolePermissionService.getAllRoles(true);
      setRoles(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader
          userName="Admin User"
          userRole="Permission Manager"
        />

        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Role & Permission Management
              </h1>
              <p className="text-gray-600">Configure role-based access control for your system</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                >
                  <span className="text-xl">&times;</span>
                </button>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{success}</span>
                <button
                  onClick={() => setSuccess(null)}
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                >
                  <span className="text-xl">&times;</span>
                </button>
              </div>
            )}

            {/* Roles Grid */}
            {loading ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-4 text-gray-600">Loading roles and permissions...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles?.map((role) => (
                  <div key={role?.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {role?.display_name}
                          </h3>
                          <p className="text-sm text-gray-500">{role?.name}</p>
                          {role?.is_system_role && (
                            <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">
                              System Role
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">Level</span>
                          <div className="text-lg font-bold text-blue-600">{role?.level}</div>
                        </div>
                      </div>

                      {role?.description && (
                        <p className="text-sm text-gray-600 mb-4">{role?.description}</p>
                      )}

                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-2">Permissions</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {role?.permissions?.length || 0} assigned
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      {/* Unified Real-time Connection Overlay */}
      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}

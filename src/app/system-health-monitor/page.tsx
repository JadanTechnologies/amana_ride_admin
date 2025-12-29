import React from 'react';
import type { Metadata } from 'next';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import SystemHealthInteractive from './components/SystemHealthInteractive';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';

export const metadata: Metadata = {
  title: 'System Health Monitor - Amana Ride Admin',
  description: 'Comprehensive technical performance oversight for platform reliability, API monitoring, and infrastructure health across all services with real-time incident tracking and automated alerting.',
};

export default function SystemHealthMonitor() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader
          userName="Admin User"
          userRole="Super Admin"
        />

        <main className="p-6">
          <div className="max-w-[1600px] mx-auto">
            <NavigationBreadcrumbs />

            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-foreground mb-2">System Health Monitor</h1>
              <p className="text-muted-foreground">
                Real-time technical performance oversight and infrastructure health monitoring
              </p>
            </div>

            <SystemHealthInteractive />
          </div>
        </main>
      </div>

      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}

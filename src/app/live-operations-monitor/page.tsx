import React from 'react';
import type { Metadata } from 'next';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';

import LiveOperationsInteractive from './components/LiveOperationsInteractive';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';

export const metadata: Metadata = {
  title: 'Live Operations Monitor - Amana Ride Admin',
  description: 'Real-time operational command center for managing active services, driver performance, and trip monitoring across Nigerian transportation markets.',
};

export default function LiveOperationsMonitor() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader
          userName="Admin User"
          userRole="Operations Manager"
        />

        <main className="p-6">
          <LiveOperationsInteractive />
        </main>
      </div>

      {/* Unified Real-time Connection Overlay */}
      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}

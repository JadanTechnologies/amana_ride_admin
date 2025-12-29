import React from 'react';
import type { Metadata } from 'next';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import FinancialAnalyticsInteractive from './components/FinancialAnalyticsInteractive';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';

export const metadata: Metadata = {
  title: 'Financial Analytics - Amana Ride Admin',
  description: 'Comprehensive revenue tracking, commission analysis, and payment reconciliation dashboard for ride-hailing platform financial oversight and audit-ready reporting.',
};

export default function FinancialAnalytics() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader
          userName="Admin User"
          userRole="Financial Manager"
        />

        <main className="p-6">
          <div className="max-w-[1600px] mx-auto">
            <NavigationBreadcrumbs />

            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                Financial Analytics Dashboard
              </h1>
              <p className="text-muted-foreground">
                Comprehensive revenue tracking, commission analysis, and payment reconciliation across all service types
              </p>
            </div>

            <FinancialAnalyticsInteractive />
          </div>
        </main>
      </div>

      {/* Unified Real-time Connection Overlay */}
      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}

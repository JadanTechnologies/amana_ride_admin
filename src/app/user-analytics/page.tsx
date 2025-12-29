import React from 'react';
import type { Metadata } from 'next';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import UserAnalyticsInteractive from './components/UserAnalyticsInteractive';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';

export const metadata: Metadata = {
  title: 'User Analytics - Amana Ride Admin',
  description: 'Comprehensive passenger and driver behavior insights with advanced segmentation, retention analysis, and predictive churn indicators for data-driven user experience optimization.',
};

export default function UserAnalytics() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader
          userName="Admin User"
          userRole="Analytics Manager"
        />

        <main className="p-6">
          <NavigationBreadcrumbs />

          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              User Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Comprehensive insights into passenger and driver behavior patterns, retention metrics, and predictive analytics
            </p>
          </div>

          <UserAnalyticsInteractive />
        </main>
      </div>

      {/* Unified Real-time Connection Overlay */}
      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}

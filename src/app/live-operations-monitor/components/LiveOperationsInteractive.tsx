'use client';

import { useState } from 'react';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import QuickActionPanel from '@/components/common/QuickActionPanel';
import EmergencyControlPanel from './EmergencyControlPanel';
import OperationsMetrics from './OperationsMetrics';
import LiveMap from './LiveMap';
import DriverPerformanceFeed from './DriverPerformanceFeed';
import ServiceRequestsGrid from './ServiceRequestsGrid';

const LiveOperationsInteractive = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Lagos');
  const [emergencyMode, setEmergencyMode] = useState(false);

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleQuickActionToggle = () => {
    setIsQuickActionOpen(!isQuickActionOpen);
  };

  const handleEmergencyToggle = (enabled: boolean) => {
    setEmergencyMode(enabled);
    console.log('Emergency mode:', enabled);
  };

  const handleServiceAreaChange = (area: string) => {
    setSelectedCity(area);
    console.log('Service area changed to:', area);
  };

  const handleDriverClick = (driverId: string) => {
    console.log('Driver clicked:', driverId);
  };

  const handleContactDriver = (driverId: string) => {
    console.log('Contact driver:', driverId);
  };

  const handleInterventionClick = (requestId: string) => {
    console.log('Intervention requested for:', requestId);
  };

  const handleRoleSwitch = (role: string) => {
    console.log('Role switched to:', role);
  };

  const handleLogout = () => {
    console.log('Logout triggered');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={handleSidebarToggle} />

      <div
        className={`transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]'
        }`}
      >
        <RoleContextHeader
          userName="Operations Admin"
          userRole="Operations Admin"
          onRoleSwitch={handleRoleSwitch}
          onLogout={handleLogout}
        />

        <main className="p-6">
          <div className="max-w-[1920px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-semibold text-foreground mb-2">Live Operations Monitor</h1>
                <NavigationBreadcrumbs />
              </div>
              <button
                onClick={handleQuickActionToggle}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-error text-error-foreground hover:bg-error/90 transition-smooth shadow-elevation-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium">Quick Actions</span>
              </button>
            </div>

            <div className="space-y-6">
              <EmergencyControlPanel
                onEmergencyToggle={handleEmergencyToggle}
                onServiceAreaChange={handleServiceAreaChange}
              />

              <OperationsMetrics serviceType="all" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <LiveMap selectedCity={selectedCity} onDriverClick={handleDriverClick} />
                </div>
                <div className="lg:col-span-4">
                  <DriverPerformanceFeed onContactDriver={handleContactDriver} />
                </div>
              </div>

              <ServiceRequestsGrid onInterventionClick={handleInterventionClick} />
            </div>
          </div>
        </main>
      </div>

      <QuickActionPanel
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        userRole="Operations Admin"
      />
    </div>
  );
};

export default LiveOperationsInteractive;
'use client';

import { useState, useEffect } from 'react';
import KPIMetricCard from './KPIMetricCard';
import LiveActivityFeed from './LiveActivityFeed';
import TripSummaryTable from './TripSummaryTable';
import SystemHealthIndicator from './SystemHealthIndicator';
import Icon from '@/components/ui/AppIcon';

interface DashboardInteractiveProps {
  initialData: {
    kpiMetrics: any[];
    activities: any[];
    trips: any[];
    healthMetrics: any[];
    overallScore: number;
  };
}

const DashboardInteractive = ({ initialData }: DashboardInteractiveProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedService, setSelectedService] = useState('All Services');
  const [refreshInterval, setRefreshInterval] = useState('30sec');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  const cities = ['All Cities', 'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan'];
  const services = ['All Services', 'Okada', 'Keke Napep', 'Mini Bus', 'Logistics'];
  const intervals = ['30sec', '1min', '5min'];

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-elevation-1">
        <div className="flex flex-wrap items-center gap-4">
          {/* City Filter */}
          <div className="flex items-center gap-2">
            <Icon name="MapPinIcon" size={20} className="text-muted-foreground" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Service Filter */}
          <div className="flex items-center gap-2">
            <Icon name="TruckIcon" size={20} className="text-muted-foreground" />
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {services.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          {/* Refresh Interval */}
          <div className="flex items-center gap-2">
            <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground" />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {intervals.map((interval) => (
                <option key={interval} value={interval}>{interval}</option>
              ))}
            </select>
          </div>

          {/* Connection Status */}
          <div className="ml-auto flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-success animate-pulse' : 'bg-error'}`} />
            <span className="caption text-muted-foreground text-sm">
              {connectionStatus === 'connected' ? 'Live' : 'Disconnected'}
            </span>
          </div>

          {/* Quick Actions */}
          <button
            onClick={() => setIsQuickActionsOpen(true)}
            className="px-4 py-2 rounded-md bg-error text-error-foreground hover:bg-error/90 transition-smooth flex items-center gap-2"
          >
            <Icon name="BoltIcon" size={20} />
            <span className="text-sm font-medium">Quick Actions</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {initialData.kpiMetrics.map((metric, index) => (
          <KPIMetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map and Trip Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Map */}
          <div className="bg-card border border-border rounded-lg shadow-elevation-1 overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Live Operations Map</h3>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-md hover:bg-muted transition-smooth" aria-label="Toggle heat map">
                    <Icon name="FireIcon" size={20} className="text-muted-foreground" />
                  </button>
                  <button className="p-2 rounded-md hover:bg-muted transition-smooth" aria-label="Fullscreen">
                    <Icon name="ArrowsPointingOutIcon" size={20} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
            <div className="relative h-[400px] bg-muted">
              <iframe
                width="100%"
                height="100%"
                loading="lazy"
                title="Live Operations Map"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=6.5244,3.3792&z=12&output=embed"
                className="border-0"
              />
              <div className="absolute top-4 left-4 bg-card border border-border rounded-lg p-3 shadow-elevation-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="caption text-xs text-foreground">Active Trips: 247</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="caption text-xs text-foreground">Online Drivers: 1,834</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Summary Table */}
          <TripSummaryTable trips={initialData.trips} />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Live Activity Feed */}
          <LiveActivityFeed activities={initialData.activities} />

          {/* System Health */}
          <SystemHealthIndicator 
            metrics={initialData.healthMetrics} 
            overallScore={initialData.overallScore}
          />
        </div>
      </div>

      {/* Quick Actions Modal */}
      {isQuickActionsOpen && (
        <>
          <div
            className="fixed inset-0 bg-background z-[290]"
            onClick={() => setIsQuickActionsOpen(false)}
          />
          <div className="fixed inset-0 z-[295] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-card rounded-xl shadow-elevation-4 animate-fade-in">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                <button
                  onClick={() => setIsQuickActionsOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-smooth"
                  aria-label="Close"
                >
                  <Icon name="XMarkIcon" size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button className="flex items-center gap-4 p-4 rounded-lg bg-error text-error-foreground hover:bg-error/90 transition-smooth">
                    <Icon name="SpeakerWaveIcon" size={24} />
                    <span className="font-medium">Emergency Broadcast</span>
                  </button>
                  <button className="flex items-center gap-4 p-4 rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-smooth">
                    <Icon name="BellAlertIcon" size={24} />
                    <span className="font-medium">System Alert</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardInteractive;
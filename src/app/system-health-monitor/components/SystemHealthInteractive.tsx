'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import SystemMetricsCard from './SystemMetricsCard';
import PerformanceChart from './PerformanceChart';
import IncidentFeedItem from './IncidentFeedItem';
import ServiceStatusGrid from './ServiceStatusGrid';

interface SystemMetric {
  title: string;
  value: string;
  unit: string;
  icon: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: number;
  threshold: string;
}

interface PerformanceDataPoint {
  time: string;
  apiResponse: number;
  dbQuery: number;
  errorRate: number;
  activeConnections: number;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  service: string;
  status: 'active' | 'investigating' | 'resolved';
}

interface ServiceStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: string;
  responseTime: string;
  lastCheck: string;
  dependencies: string[];
}

const SystemHealthInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [environment, setEnvironment] = useState('production');
  const [monitoringScope, setMonitoringScope] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const systemMetrics: SystemMetric[] = [
    {
      title: 'API Response Time',
      value: '145',
      unit: 'ms',
      icon: 'BoltIcon',
      status: 'healthy',
      trend: -5.2,
      threshold: '< 200ms',
    },
    {
      title: 'Database Query Performance',
      value: '89',
      unit: 'ms',
      icon: 'CircleStackIcon',
      status: 'healthy',
      trend: -3.1,
      threshold: '< 150ms',
    },
    {
      title: 'Server Uptime',
      value: '99.98',
      unit: '%',
      icon: 'ServerIcon',
      status: 'healthy',
      trend: 0.02,
      threshold: '> 99.9%',
    },
    {
      title: 'Error Rate',
      value: '0.8',
      unit: '%',
      icon: 'ExclamationTriangleIcon',
      status: 'warning',
      trend: 0.3,
      threshold: '< 1%',
    },
    {
      title: 'Active Connections',
      value: '1,245',
      unit: 'conn',
      icon: 'SignalIcon',
      status: 'healthy',
      trend: 12.5,
      threshold: '< 2000',
    },
    {
      title: 'Security Events',
      value: '3',
      unit: 'events',
      icon: 'ShieldCheckIcon',
      status: 'healthy',
      trend: -25.0,
      threshold: '< 10',
    },
  ];

  const performanceData: PerformanceDataPoint[] = [
    { time: '00:00', apiResponse: 120, dbQuery: 75, errorRate: 0.5, activeConnections: 980 },
    { time: '04:00', apiResponse: 135, dbQuery: 82, errorRate: 0.6, activeConnections: 1050 },
    { time: '08:00', apiResponse: 165, dbQuery: 95, errorRate: 1.2, activeConnections: 1450 },
    { time: '12:00', apiResponse: 145, dbQuery: 89, errorRate: 0.8, activeConnections: 1245 },
    { time: '16:00', apiResponse: 155, dbQuery: 92, errorRate: 0.9, activeConnections: 1380 },
    { time: '20:00', apiResponse: 140, dbQuery: 85, errorRate: 0.7, activeConnections: 1180 },
  ];

  const incidents: Incident[] = [
    {
      id: '1',
      title: 'High API Response Time Detected',
      description: 'Payment gateway API experiencing elevated response times above threshold. Investigating potential network latency issues.',
      severity: 'high',
      timestamp: '5 mins ago',
      service: 'Payment Service',
      status: 'investigating',
    },
    {
      id: '2',
      title: 'Database Connection Pool Warning',
      description: 'Connection pool utilization reached 85%. Consider scaling database resources during peak hours.',
      severity: 'medium',
      timestamp: '12 mins ago',
      service: 'Database Cluster',
      status: 'investigating',
    },
    {
      id: '3',
      title: 'Security Event: Multiple Failed Login Attempts',
      description: 'Detected 15 failed login attempts from IP 192.168.1.100. Automatic rate limiting applied.',
      severity: 'low',
      timestamp: '18 mins ago',
      service: 'Authentication Service',
      status: 'resolved',
    },
    {
      id: '4',
      title: 'SMS Gateway Degraded Performance',
      description: 'Third-party SMS provider reporting 15% delivery delays. Monitoring situation closely.',
      severity: 'medium',
      timestamp: '25 mins ago',
      service: 'Notification Service',
      status: 'active',
    },
    {
      id: '5',
      title: 'Cache Hit Rate Below Optimal',
      description: 'Redis cache hit rate dropped to 78%. Investigating cache invalidation patterns.',
      severity: 'low',
      timestamp: '32 mins ago',
      service: 'Cache Layer',
      status: 'resolved',
    },
  ];

  const services: ServiceStatus[] = [
    {
      id: '1',
      name: 'API Gateway',
      status: 'operational',
      uptime: '99.98%',
      responseTime: '145ms',
      lastCheck: '30s ago',
      dependencies: ['Auth Service', 'Database'],
    },
    {
      id: '2',
      name: 'Payment Service',
      status: 'degraded',
      uptime: '99.85%',
      responseTime: '285ms',
      lastCheck: '30s ago',
      dependencies: ['Paystack', 'Flutterwave'],
    },
    {
      id: '3',
      name: 'Notification Service',
      status: 'operational',
      uptime: '99.95%',
      responseTime: '120ms',
      lastCheck: '30s ago',
      dependencies: ['SMS Gateway', 'Email Service'],
    },
    {
      id: '4',
      name: 'Database Cluster',
      status: 'operational',
      uptime: '99.99%',
      responseTime: '89ms',
      lastCheck: '30s ago',
      dependencies: [],
    },
    {
      id: '5',
      name: 'Cache Layer',
      status: 'operational',
      uptime: '99.97%',
      responseTime: '12ms',
      lastCheck: '30s ago',
      dependencies: ['Redis Primary', 'Redis Replica'],
    },
    {
      id: '6',
      name: 'WebSocket Server',
      status: 'operational',
      uptime: '99.92%',
      responseTime: '45ms',
      lastCheck: '30s ago',
      dependencies: ['Load Balancer'],
    },
  ];

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading system health monitor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-elevation-1">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Icon name="ServerIcon" size={20} className="text-primary" />
              <span className="font-medium text-foreground">Environment:</span>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Icon name="FunnelIcon" size={20} className="text-primary" />
              <span className="font-medium text-foreground">Scope:</span>
              <select
                value={monitoringScope}
                onChange={(e) => setMonitoringScope(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Services</option>
                <option value="api">API Only</option>
                <option value="database">Database Only</option>
                <option value="services">Services Only</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="autoRefresh" className="text-sm text-foreground cursor-pointer">
                Auto-refresh
              </label>
            </div>

            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>

            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-smooth flex items-center gap-2">
              <Icon name="ArrowPathIcon" size={16} />
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* System Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {systemMetrics.map((metric, index) => (
          <SystemMetricsCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart - 2 columns */}
        <div className="lg:col-span-2">
          <PerformanceChart data={performanceData} />
        </div>

        {/* Incident Feed - 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6 shadow-elevation-1 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Incident Feed</h2>
                <p className="caption text-muted-foreground text-sm">Real-time alerts and warnings</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-error animate-pulse-subtle" />
                <span className="caption text-muted-foreground text-xs">2 Active</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-custom">
              {incidents.map((incident) => (
                <IncidentFeedItem key={incident.id} {...incident} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Service Status Grid */}
      <ServiceStatusGrid services={services} />

      {/* System Information Footer */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-elevation-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="ClockIcon" size={16} className="text-muted-foreground" />
              <span className="caption text-muted-foreground text-xs uppercase">Last Updated</span>
            </div>
            <p className="text-sm font-medium text-foreground">Just now</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="ServerIcon" size={16} className="text-muted-foreground" />
              <span className="caption text-muted-foreground text-xs uppercase">Total Services</span>
            </div>
            <p className="text-sm font-medium text-foreground">24 Services</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="CheckCircleIcon" size={16} className="text-success" />
              <span className="caption text-muted-foreground text-xs uppercase">Operational</span>
            </div>
            <p className="text-sm font-medium text-foreground">22 Services</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="ExclamationTriangleIcon" size={16} className="text-warning" />
              <span className="caption text-muted-foreground text-xs uppercase">Incidents</span>
            </div>
            <p className="text-sm font-medium text-foreground">2 Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthInteractive;
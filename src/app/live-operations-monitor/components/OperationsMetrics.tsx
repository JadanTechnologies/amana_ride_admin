'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface MetricData {
  id: string;
  label: string;
  value: string | number;
  change: number;
  icon: string;
  variant: 'primary' | 'success' | 'warning' | 'error';
  trend: 'up' | 'down' | 'stable';
}

interface OperationsMetricsProps {
  serviceType?: string;
}

const OperationsMetrics = ({ serviceType = 'all' }: OperationsMetricsProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const mockMetrics: MetricData[] = [
      {
        id: 'active-drivers',
        label: 'Active Drivers',
        value: 847,
        change: 12.5,
        icon: 'UserGroupIcon',
        variant: 'success',
        trend: 'up',
      },
      {
        id: 'pending-requests',
        label: 'Pending Requests',
        value: 23,
        change: -8.3,
        icon: 'ClockIcon',
        variant: 'warning',
        trend: 'down',
      },
      {
        id: 'avg-response',
        label: 'Avg Response Time',
        value: '2.4 min',
        change: -15.2,
        icon: 'BoltIcon',
        variant: 'success',
        trend: 'down',
      },
      {
        id: 'cancellation-rate',
        label: 'Cancellation Rate',
        value: '4.2%',
        change: 2.1,
        icon: 'XCircleIcon',
        variant: 'error',
        trend: 'up',
      },
      {
        id: 'peak-zones',
        label: 'Peak Demand Zones',
        value: 12,
        change: 5.0,
        icon: 'MapPinIcon',
        variant: 'primary',
        trend: 'up',
      },
      {
        id: 'capacity',
        label: 'System Capacity',
        value: '78%',
        change: 3.5,
        icon: 'ChartBarIcon',
        variant: 'primary',
        trend: 'up',
      },
    ];

    setMetrics(mockMetrics);

    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value:
            typeof metric.value === 'number'
              ? metric.value + Math.floor(Math.random() * 10 - 5)
              : metric.value,
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isHydrated, serviceType]);

  const getVariantStyles = (variant: string) => {
    const styles = {
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-error/10 text-error',
    };
    return styles[variant as keyof typeof styles] || styles.primary;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return 'ArrowUpIcon';
    if (trend === 'down') return 'ArrowDownIcon';
    return 'MinusIcon';
  };

  if (!isHydrated) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-4 animate-pulse">
            <div className="h-10 bg-muted rounded mb-2" />
            <div className="h-6 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="bg-card rounded-lg border border-border p-4 hover:shadow-elevation-2 transition-smooth"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg ${getVariantStyles(metric.variant)} flex items-center justify-center`}>
              <Icon name={metric.icon as any} size={20} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${metric.change >= 0 ? 'text-success' : 'text-error'}`}>
              <Icon name={getTrendIcon(metric.trend) as any} size={14} />
              <span>{Math.abs(metric.change)}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
            <p className="caption text-muted-foreground text-xs">{metric.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OperationsMetrics;
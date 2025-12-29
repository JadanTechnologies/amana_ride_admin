'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface DriverPerformance {
  id: string;
  name: string;
  avatar: string;
  serviceType: 'okada' | 'keke' | 'minibus' | 'logistics';
  status: 'available' | 'busy' | 'offline';
  rating: number;
  completionRate: number;
  todayEarnings: number;
  tripsToday: number;
  lastActivity: string;
}

interface DriverPerformanceFeedProps {
  onContactDriver?: (driverId: string) => void;
}

const DriverPerformanceFeed = ({ onContactDriver }: DriverPerformanceFeedProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [filter, setFilter] = useState<'all' | 'available' | 'busy'>('all');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const mockDrivers: DriverPerformance[] = [
      {
        id: 'D001',
        name: 'Chukwu Okafor',
        avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
        serviceType: 'okada',
        status: 'available',
        rating: 4.8,
        completionRate: 96,
        todayEarnings: 12500,
        tripsToday: 18,
        lastActivity: '2 min ago',
      },
      {
        id: 'D002',
        name: 'Amina Bello',
        avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg',
        serviceType: 'keke',
        status: 'busy',
        rating: 4.6,
        completionRate: 94,
        todayEarnings: 15800,
        tripsToday: 22,
        lastActivity: 'Active now',
      },
      {
        id: 'D003',
        name: 'Tunde Adeyemi',
        avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
        serviceType: 'minibus',
        status: 'available',
        rating: 4.9,
        completionRate: 98,
        todayEarnings: 28400,
        tripsToday: 14,
        lastActivity: '5 min ago',
      },
      {
        id: 'D004',
        name: 'Ngozi Eze',
        avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
        serviceType: 'logistics',
        status: 'busy',
        rating: 4.7,
        completionRate: 95,
        todayEarnings: 32100,
        tripsToday: 9,
        lastActivity: 'Active now',
      },
      {
        id: 'D005',
        name: 'Ibrahim Musa',
        avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg',
        serviceType: 'okada',
        status: 'available',
        rating: 4.5,
        completionRate: 92,
        todayEarnings: 9800,
        tripsToday: 15,
        lastActivity: '8 min ago',
      },
    ];

    setDrivers(mockDrivers);
  }, [isHydrated]);

  const handleContactDriver = (driverId: string) => {
    if (onContactDriver) {
      onContactDriver(driverId);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-success',
      busy: 'bg-warning',
      offline: 'bg-muted-foreground',
    };
    return colors[status as keyof typeof colors] || colors.offline;
  };

  const getServiceTypeLabel = (type: string) => {
    const labels = {
      okada: 'Okada',
      keke: 'Keke Napep',
      minibus: 'Mini Bus',
      logistics: 'Logistics',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredDrivers = filter === 'all' ? drivers : drivers.filter((d) => d.status === filter);

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="h-8 bg-muted rounded mb-4 animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground mb-3">Driver Performance Feed</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
              filter === 'available' ? 'bg-success text-success-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setFilter('busy')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
              filter === 'busy' ? 'bg-warning text-warning-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Busy
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-custom">
        <div className="p-4 space-y-4">
          {filteredDrivers.map((driver) => (
            <div key={driver.id} className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-smooth">
              <div className="flex items-start gap-3 mb-3">
                <div className="relative flex-shrink-0">
                  <AppImage
                    src={driver.avatar}
                    alt={`Professional photo of ${driver.name}, ${getServiceTypeLabel(driver.serviceType)} driver`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${getStatusColor(driver.status)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm text-foreground">{driver.name}</h4>
                      <p className="caption text-muted-foreground text-xs">{getServiceTypeLabel(driver.serviceType)}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-warning/10 px-2 py-1 rounded">
                      <Icon name="StarIcon" size={12} className="text-warning" />
                      <span className="text-xs font-medium text-warning">{driver.rating}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="caption text-muted-foreground text-xs mb-1">Completion Rate</p>
                  <p className="text-sm font-semibold text-foreground">{driver.completionRate}%</p>
                </div>
                <div>
                  <p className="caption text-muted-foreground text-xs mb-1">Today&apos;s Earnings</p>
                  <p className="text-sm font-semibold text-foreground">₦{driver.todayEarnings.toLocaleString()}</p>
                </div>
                <div>
                  <p className="caption text-muted-foreground text-xs mb-1">Trips Today</p>
                  <p className="text-sm font-semibold text-foreground">{driver.tripsToday}</p>
                </div>
                <div>
                  <p className="caption text-muted-foreground text-xs mb-1">Last Activity</p>
                  <p className="text-sm font-semibold text-foreground">{driver.lastActivity}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleContactDriver(driver.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-smooth"
                >
                  <Icon name="ChatBubbleLeftRightIcon" size={14} />
                  <span>Contact</span>
                </button>
                <button className="px-3 py-2 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-smooth">
                  <Icon name="EllipsisVerticalIcon" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverPerformanceFeed;
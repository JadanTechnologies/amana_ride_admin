'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Driver {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy' | 'offline';
  serviceType: 'okada' | 'keke' | 'minibus' | 'logistics';
  rating: number;
}

interface Incident {
  id: string;
  type: 'emergency' | 'accident' | 'breakdown' | 'dispute';
  lat: number;
  lng: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface LiveMapProps {
  selectedCity?: string;
  onDriverClick?: (driverId: string) => void;
}

const LiveMap = ({ selectedCity = 'Lagos', onDriverClick }: LiveMapProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [mapView, setMapView] = useState<'standard' | 'heatmap' | 'incidents'>('standard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const mockDrivers: Driver[] = [
      { id: 'D001', name: 'Chukwu Okafor', lat: 6.5244, lng: 3.3792, status: 'available', serviceType: 'okada', rating: 4.8 },
      { id: 'D002', name: 'Amina Bello', lat: 6.4541, lng: 3.3947, status: 'busy', serviceType: 'keke', rating: 4.6 },
      { id: 'D003', name: 'Tunde Adeyemi', lat: 6.6018, lng: 3.3515, status: 'available', serviceType: 'minibus', rating: 4.9 },
      { id: 'D004', name: 'Ngozi Eze', lat: 6.4698, lng: 3.5852, status: 'busy', serviceType: 'logistics', rating: 4.7 },
      { id: 'D005', name: 'Ibrahim Musa', lat: 6.5355, lng: 3.3087, status: 'available', serviceType: 'okada', rating: 4.5 },
    ];

    const mockIncidents: Incident[] = [
      { id: 'I001', type: 'emergency', lat: 6.5244, lng: 3.3792, severity: 'high', description: 'Driver reported emergency assistance needed' },
      { id: 'I002', type: 'accident', lat: 6.4541, lng: 3.3947, severity: 'medium', description: 'Minor traffic accident reported' },
    ];

    setDrivers(mockDrivers);
    setIncidents(mockIncidents);
  }, [isHydrated, selectedCity]);

  const handleDriverClick = (driverId: string) => {
    if (onDriverClick) {
      onDriverClick(driverId);
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

  const getSeverityColor = (severity: string) => {
    const colors = {
      high: 'bg-error',
      medium: 'bg-warning',
      low: 'bg-info',
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="h-[600px] bg-muted animate-pulse flex items-center justify-center">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Live Operations Map - {selectedCity}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMapView('standard')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-smooth ${
              mapView === 'standard' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setMapView('heatmap')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-smooth ${
              mapView === 'heatmap' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Heat Map
          </button>
          <button
            onClick={() => setMapView('incidents')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-smooth ${
              mapView === 'incidents' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Incidents
          </button>
        </div>
      </div>

      <div className="relative h-[600px] bg-muted">
        <iframe
          width="100%"
          height="100%"
          loading="lazy"
          title={`${selectedCity} Operations Map`}
          referrerPolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=6.5244,3.3792&z=12&output=embed"
          className="w-full h-full"
        />

        {mapView === 'standard' && (
          <div className="absolute top-4 right-4 bg-card rounded-lg border border-border p-3 shadow-elevation-2 max-w-xs">
            <h4 className="font-medium text-sm text-foreground mb-2">Active Drivers ({drivers.length})</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-custom">
              {drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => handleDriverClick(driver.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-smooth text-left"
                >
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(driver.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{driver.name}</p>
                    <p className="caption text-muted-foreground text-xs">{driver.serviceType}</p>
                  </div>
                  <Icon name="ChevronRightIcon" size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {mapView === 'incidents' && incidents.length > 0 && (
          <div className="absolute top-4 right-4 bg-card rounded-lg border border-border p-3 shadow-elevation-2 max-w-xs">
            <h4 className="font-medium text-sm text-foreground mb-2">Active Incidents ({incidents.length})</h4>
            <div className="space-y-2">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-2 rounded-md bg-muted">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getSeverityColor(incident.severity)}`} />
                    <p className="text-xs font-medium text-foreground capitalize">{incident.type}</p>
                  </div>
                  <p className="caption text-muted-foreground text-xs">{incident.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mapView === 'heatmap' && (
          <div className="absolute bottom-4 left-4 bg-card rounded-lg border border-border p-3 shadow-elevation-2">
            <h4 className="font-medium text-sm text-foreground mb-2">Demand Intensity</h4>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-success/30" />
                <span className="caption text-xs text-muted-foreground">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-warning/50" />
                <span className="caption text-xs text-muted-foreground">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-error/70" />
                <span className="caption text-xs text-muted-foreground">High</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMap;
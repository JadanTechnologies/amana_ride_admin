'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface EmergencyControlPanelProps {
  onEmergencyToggle?: (enabled: boolean) => void;
  onServiceAreaChange?: (area: string) => void;
}

const EmergencyControlPanel = ({ onEmergencyToggle, onServiceAreaChange }: EmergencyControlPanelProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Lagos');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const interval = setInterval(() => {
      setConnectionStatus((prev) => (prev === 'connected' ? 'connected' : 'connected'));
    }, 3000);

    return () => clearInterval(interval);
  }, [isHydrated]);

  const handleEmergencyToggle = () => {
    const newState = !emergencyMode;
    setEmergencyMode(newState);
    if (onEmergencyToggle) {
      onEmergencyToggle(newState);
    }
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    if (onServiceAreaChange) {
      onServiceAreaChange(city);
    }
  };

  const cities = ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan'];

  const getConnectionColor = (status: string) => {
    const colors = {
      connected: 'bg-success',
      connecting: 'bg-warning',
      disconnected: 'bg-error',
    };
    return colors[status as keyof typeof colors] || colors.disconnected;
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="h-16 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="CommandLineIcon" size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Operations Control Center</h3>
              <p className="caption text-muted-foreground text-xs">Real-time monitoring and intervention</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getConnectionColor(connectionStatus)} ${connectionStatus === 'connected' ? 'animate-pulse-subtle' : ''}`} />
            <span className="caption text-muted-foreground text-xs capitalize">{connectionStatus}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="caption text-muted-foreground text-xs font-medium uppercase mb-2 block">Emergency Mode</label>
            <button
              onClick={handleEmergencyToggle}
              className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-smooth ${
                emergencyMode
                  ? 'bg-error/10 border-error text-error' :'bg-muted border-border text-foreground hover:bg-muted/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={emergencyMode ? 'ShieldExclamationIcon' : 'ShieldCheckIcon'} size={20} />
                <span className="font-medium text-sm">{emergencyMode ? 'Active' : 'Inactive'}</span>
              </div>
              <div className={`w-12 h-6 rounded-full transition-smooth ${emergencyMode ? 'bg-error' : 'bg-muted-foreground'} relative`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-smooth ${emergencyMode ? 'right-1' : 'left-1'}`} />
              </div>
            </button>
          </div>

          <div className="md:col-span-1">
            <label className="caption text-muted-foreground text-xs font-medium uppercase mb-2 block">Service Area</label>
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-border bg-background text-foreground appearance-none cursor-pointer hover:border-primary transition-smooth"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <Icon name="ChevronDownIcon" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="caption text-muted-foreground text-xs font-medium uppercase mb-2 block">Quick Actions</label>
            <div className="flex items-center gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-smooth">
                <Icon name="BellAlertIcon" size={16} />
                <span className="text-sm font-medium">Alert</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth">
                <Icon name="BoltIcon" size={16} />
                <span className="text-sm font-medium">Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {emergencyMode && (
        <div className="p-4 border-t border-border bg-error/5">
          <div className="flex items-start gap-3">
            <Icon name="ExclamationTriangleIcon" size={20} className="text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error mb-1">Emergency Mode Active</p>
              <p className="caption text-muted-foreground text-xs">
                All non-critical operations are paused. Priority support and emergency response protocols are now active.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyControlPanel;
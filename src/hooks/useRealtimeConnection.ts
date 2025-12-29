import { useState, useEffect, useCallback } from 'react';
import { realtimeManager, ConnectionHealth } from '@/services/realtimeConnectionManager';

/**
 * Custom hook for managing real-time connections with health monitoring
 * Provides connection status, manual reconnection, and automatic cleanup
 */
export function useRealtimeConnection() {
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (!isEnabled) return;

    // Subscribe to connection status changes
    const unsubscribe = realtimeManager.onStatusChange((health) => {
      setConnectionHealth(health);
    });

    return () => {
      unsubscribe();
    };
  }, [isEnabled]);

  const reconnect = useCallback(async () => {
    await realtimeManager.reconnectAll();
  }, []);

  const toggleConnection = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  const getStatusColor = useCallback(() => {
    if (!connectionHealth) return 'gray';

    switch (connectionHealth.status) {
      case 'HEALTHY': case'CONNECTED':
        return 'green';
      case 'CONNECTING': case'RECONNECTING':
        return 'yellow';
      case 'ERROR': case'DISCONNECTED':
        return 'red';
      default:
        return 'gray';
    }
  }, [connectionHealth]);

  const getStatusText = useCallback(() => {
    if (!connectionHealth) return 'Initializing';

    switch (connectionHealth.status) {
      case 'HEALTHY':
        return 'Live & Healthy';
      case 'CONNECTED':
        return 'Connected';
      case 'CONNECTING':
        return 'Connecting';
      case 'RECONNECTING':
        return `Reconnecting (${connectionHealth.reconnectAttempts}/5)`;
      case 'ERROR':
        return 'Error';
      case 'DISCONNECTED':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  }, [connectionHealth]);

  const isHealthy = connectionHealth?.status === 'HEALTHY' || connectionHealth?.status === 'CONNECTED';
  const isConnecting = connectionHealth?.status === 'CONNECTING' || connectionHealth?.status === 'RECONNECTING';
  const hasError = connectionHealth?.status === 'ERROR' || connectionHealth?.status === 'DISCONNECTED';

  return {
    connectionHealth,
    isEnabled,
    isHealthy,
    isConnecting,
    hasError,
    reconnect,
    toggleConnection,
    getStatusColor,
    getStatusText,
  };
}

/**
 * Hook for tracking real-time data synchronization with conflict detection
 */
export function useRealtimeSync(channelName: string) {
  const [syncStatus, setSyncStatus] = useState({
    isValid: true,
    lastValidation: Date.now(),
    missedUpdates: 0,
    conflictDetected: false,
    lastConflictTime: null as number | null,
    recentConflicts: [] as Array<{ timestamp: number; reason: string }>,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const validation = realtimeManager.getSyncValidation(channelName);
      const conflicts = realtimeManager.getSyncConflicts(channelName);
      
      if (validation) {
        setSyncStatus({
          isValid: validation.isValid,
          lastValidation: validation.lastValidation,
          missedUpdates: validation.missedUpdates,
          conflictDetected: validation.conflictDetected,
          lastConflictTime: validation.lastConflictTime,
          recentConflicts: conflicts,
        });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [channelName]);

  const clearConflicts = useCallback(() => {
    realtimeManager.clearSyncConflicts(channelName);
  }, [channelName]);

  return {
    ...syncStatus,
    clearConflicts,
  };
}
'use client';

import React, { useState } from 'react';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';

interface RealtimeStatusIndicatorProps {
  showDetails?: boolean;
  showControls?: boolean;
  className?: string;
}

/**
 * Reusable component for displaying real-time connection status
 * Can be used across all screens that need real-time updates
 */
export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  showDetails = false,
  showControls = false,
  className = '',
}) => {
  const {
    connectionHealth,
    isEnabled,
    isHealthy,
    isConnecting,
    hasError,
    reconnect,
    toggleConnection,
    getStatusColor,
    getStatusText,
  } = useRealtimeConnection();

  const [isReconnecting, setIsReconnecting] = React.useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();

  const getIndicatorColor = () => {
    switch (statusColor) {
      case 'green':
        return 'bg-green-500 animate-pulse';
      case 'yellow':
        return 'bg-yellow-500 animate-pulse';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-3 border border-gray-200 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className={`w-3 h-3 rounded-full ${getIndicatorColor()}`}></div>
        
        {/* Status Text */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">{statusText}</span>
          
          {showDetails && connectionHealth?.lastSuccessfulSync && (
            <span className="text-xs text-gray-500">
              Last sync: {new Date(connectionHealth.lastSuccessfulSync).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Connection Controls */}
        {showControls && (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={toggleConnection}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                isEnabled
                  ? 'bg-green-600 text-white hover:bg-green-700' :'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
              title={isEnabled ? 'Pause real-time updates' : 'Resume real-time updates'}
            >
              {isEnabled ? '⏸️' : '▶️'}
            </button>
            
            <button
              onClick={handleReconnect}
              disabled={isReconnecting || !isEnabled}
              className="px-3 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              title="Reconnect real-time channels"
            >
              {isReconnecting ? '🔄' : '↻'}
            </button>
          </div>
        )}
      </div>

      {/* Detailed Information */}
      {showDetails && connectionHealth && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Active channels:</span>
            <span className="font-medium">{connectionHealth.channelCount}</span>
          </div>
          
          {connectionHealth.reconnectAttempts > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Reconnect attempts:</span>
              <span className="font-medium">{connectionHealth.reconnectAttempts}/5</span>
            </div>
          )}
          
          {connectionHealth.lastError && (
            <div className="text-xs text-red-600 mt-1">
              Error: {connectionHealth.lastError}
            </div>
          )}
        </div>
      )}

      {/* Connection Error Alert */}
      {hasError && (
        <div className="mt-2 pt-2 border-t border-red-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-600">⚠️ Connection lost</span>
            {!isConnecting && (
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {isReconnecting ? 'Reconnecting...' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
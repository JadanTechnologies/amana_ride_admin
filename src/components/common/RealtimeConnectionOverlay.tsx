'use client';

import React, { useState, useEffect } from 'react';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { syncConflictService } from '@/services/syncConflictService';

interface RealtimeConnectionOverlayProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  expandedByDefault?: boolean;
  className?: string;
}

export const RealtimeConnectionOverlay: React.FC<RealtimeConnectionOverlayProps> = ({
  position = 'bottom-right',
  expandedByDefault = false,
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

  const [isExpanded, setIsExpanded] = useState(expandedByDefault);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [conflictStats, setConflictStats] = useState<any>(null);
  const [showConflictDetails, setShowConflictDetails] = useState(false);
  const [unresolvedConflicts, setUnresolvedConflicts] = useState<any[]>([]);

  useEffect(() => {
    if (expandedByDefault && isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [expandedByDefault, isExpanded]);

  // Fetch conflict statistics when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchConflictStats();
    }
  }, [isExpanded]);

  const fetchConflictStats = async () => {
    try {
      // Get stats for main dashboard channel (or use a different channel)
      const stats = await syncConflictService.getConflictStats('dashboard-realtime');
      setConflictStats(stats);

      // Get unresolved conflicts
      const conflicts = await syncConflictService.getUnresolvedConflicts();
      setUnresolvedConflicts(conflicts);
    } catch (error) {
      console.error('Error fetching conflict stats:', error);
    }
  };

  useEffect(() => {
    if (connectionHealth?.status === 'ERROR' || connectionHealth?.status === 'DISCONNECTED') {
      setNotificationMessage('⚠️ Connection lost - Attempting to reconnect...');
      setShowNotification(true);
      
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else if (connectionHealth?.status === 'HEALTHY' && showNotification) {
      setNotificationMessage('✅ Connection restored');
      
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionHealth?.status]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconnect();
      setNotificationMessage('🔄 Reconnecting all channels...');
      setShowNotification(true);
      
      setTimeout(() => {
        setShowNotification(false);
        fetchConflictStats();
      }, 3000);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleResolveConflict = async (conflictId: string) => {
    try {
      // In a real implementation, show a modal for resolution
      // For now, just mark as resolved
      await syncConflictService.resolveConflict(
        conflictId,
        { action: 'manual_resolution' },
        'current-user-id' // Replace with actual user ID
      );
      
      setNotificationMessage('✅ Conflict resolved');
      setShowNotification(true);
      fetchConflictStats();
      
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    } catch (error) {
      setNotificationMessage('❌ Failed to resolve conflict');
      setShowNotification(true);
    }
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  const getIndicatorColor = () => {
    switch (statusColor) {
      case 'green':
        return 'bg-green-500 shadow-green-500/50';
      case 'yellow':
        return 'bg-yellow-500 shadow-yellow-500/50';
      case 'red':
        return 'bg-red-500 shadow-red-500/50';
      default:
        return 'bg-gray-400';
    }
  };

  const getBackgroundColor = () => {
    if (hasError) return 'bg-red-50 border-red-200';
    if (isConnecting) return 'bg-yellow-50 border-yellow-200';
    if (isHealthy) return 'bg-green-50 border-green-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <>
      {/* Notification Toast */}
      {showNotification && (
        <div 
          className={`fixed ${getPositionClasses()} z-[60] mb-20 animate-slide-up`}
          style={{
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-sm">
            <p className="text-sm font-medium text-gray-800">{notificationMessage}</p>
          </div>
        </div>
      )}

      {/* Main Overlay */}
      <div 
        className={`fixed ${getPositionClasses()} z-50 transition-all duration-300 ${className}`}
      >
        <div 
          className={`${getBackgroundColor()} rounded-lg shadow-lg border transition-all duration-300 ${
            isExpanded ? 'w-96' : 'w-auto'
          }`}
        >
          {/* Collapsed View */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full p-3 flex items-center gap-3 hover:bg-white/50 transition-colors rounded-lg"
            title={isExpanded ? 'Collapse' : 'Expand connection status'}
          >
            <div className="relative">
              <div 
                className={`w-3 h-3 rounded-full ${getIndicatorColor()} ${
                  (statusColor === 'green' || statusColor === 'yellow') ? 'animate-pulse' : ''
                }`}
              />
              {(statusColor === 'green' || statusColor === 'yellow') && (
                <div 
                  className={`absolute inset-0 w-3 h-3 rounded-full ${getIndicatorColor()} animate-ping opacity-75`}
                />
              )}
            </div>

            <div className="flex flex-col items-start flex-1">
              <span className="text-sm font-medium text-gray-800">{statusText}</span>
              {!isExpanded && connectionHealth?.channelCount !== undefined && (
                <span className="text-xs text-gray-600">
                  {connectionHealth.channelCount} channel{connectionHealth.channelCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <svg
              className={`w-4 h-4 text-gray-600 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded View */}
          {isExpanded && (
            <div className="px-3 pb-3 space-y-3 animate-fade-in max-h-96 overflow-y-auto">
              {/* Connection Metrics */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Active Channels</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {connectionHealth?.channelCount || 0}
                  </span>
                </div>

                {connectionHealth?.lastSuccessfulSync && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Last Sync</span>
                    <span className="text-xs font-semibold text-gray-800">
                      {new Date(connectionHealth.lastSuccessfulSync).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {connectionHealth?.reconnectAttempts > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Reconnect Attempts</span>
                    <span className="text-xs font-semibold text-yellow-700">
                      {connectionHealth.reconnectAttempts}/5
                    </span>
                  </div>
                )}
              </div>

              {/* Conflict Statistics */}
              {conflictStats && (
                <div className="pt-2 border-t border-gray-200">
                  <button
                    onClick={() => setShowConflictDetails(!showConflictDetails)}
                    className="w-full flex justify-between items-center text-xs font-medium text-gray-700 hover:text-gray-900"
                  >
                    <span>Sync Conflicts</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        conflictStats.unresolved > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {conflictStats.unresolved} unresolved
                      </span>
                      <svg
                        className={`w-3 h-3 transition-transform ${showConflictDetails ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {showConflictDetails && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600">Total</div>
                          <div className="font-semibold">{conflictStats.total}</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600">Auto-Resolved</div>
                          <div className="font-semibold text-green-700">{conflictStats.autoResolved}</div>
                        </div>
                      </div>

                      {/* Unresolved Conflicts */}
                      {unresolvedConflicts.length > 0 && (
                        <div className="bg-white rounded p-2 space-y-2">
                          <div className="text-xs font-medium text-gray-700">Recent Conflicts</div>
                          {unresolvedConflicts.slice(0, 3).map((conflict) => (
                            <div key={conflict.id} className="border-l-2 border-red-500 pl-2 text-xs">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800">
                                    {conflict.table_name}
                                  </div>
                                  <div className="text-gray-600">{conflict.conflict_type}</div>
                                  <div className="text-gray-500 text-[10px]">
                                    {new Date(conflict.detected_at).toLocaleString()}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleResolveConflict(conflict.id)}
                                  className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Resolve
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {connectionHealth?.lastError && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700 break-words">
                  <strong>Error:</strong> {connectionHealth.lastError}
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleConnection();
                  }}
                  className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                    isEnabled
                      ? 'bg-green-600 text-white hover:bg-green-700' :'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  }`}
                  title={isEnabled ? 'Pause real-time updates' : 'Resume real-time updates'}
                >
                  {isEnabled ? '⏸️ Pause' : '▶️ Resume'}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReconnect();
                  }}
                  disabled={isReconnecting || !isEnabled}
                  className="flex-1 px-3 py-2 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  title="Reconnect all channels"
                >
                  {isReconnecting ? '🔄 Connecting...' : '↻ Reconnect'}
                </button>
              </div>

              {/* Help Text */}
              <div className="text-xs text-gray-600 bg-white p-2 rounded">
                <div className="font-medium mb-1">💡 Conflict Resolution</div>
                <ul className="list-disc list-inside space-y-1 text-[10px]">
                  <li>Conflicts are automatically detected and logged</li>
                  <li>Failed operations are queued for automatic retry</li>
                  <li>Data checksums ensure integrity across updates</li>
                  <li>Click Resolve to manually handle conflicts</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};
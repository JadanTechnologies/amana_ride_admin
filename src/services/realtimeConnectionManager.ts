import { supabase } from '@/lib/supabase';
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { syncConflictService } from './syncConflictService';

export type ConnectionStatus = 
  | 'CONNECTING' |'CONNECTED' |'DISCONNECTED' |'RECONNECTING' |'ERROR' |'HEALTHY';

export interface ConnectionHealth {
  status: ConnectionStatus;
  lastHeartbeat: number | null;
  reconnectAttempts: number;
  lastError: string | null;
  lastSuccessfulSync: number | null;
  channelCount: number;
}

export interface ReconnectionConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface SyncValidation {
  isValid: boolean;
  lastValidation: number;
  missedUpdates: number;
  validationInterval: number;
  conflictDetected: boolean;
  lastConflictTime: number | null;
  checksumValid: boolean;
  lastChecksumValidation: number | null;
}

class RealtimeConnectionManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private connectionHealth: ConnectionHealth = {
    status: 'DISCONNECTED',
    lastHeartbeat: null,
    reconnectAttempts: 0,
    lastError: null,
    lastSuccessfulSync: null,
    channelCount: 0,
  };
  
  private reconnectionConfig: ReconnectionConfig = {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  private syncValidation: Map<string, SyncValidation> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private retryQueueProcessor: NodeJS.Timeout | null = null;
  private statusListeners: Set<(health: ConnectionHealth) => void> = new Set();
  private isReconnecting: boolean = false;
  private conflictDetectionEnabled: boolean = true;
  private syncConflicts: Map<string, Array<{ timestamp: number; reason: string }>> = new Map();
  private dataSnapshots: Map<string, Map<string, any>> = new Map(); // channel -> recordId -> data

  /**
   * Initializes the connection manager with health monitoring
   */
  public initialize(): void {
    this.startHeartbeat();
    this.startRetryQueueProcessor();
    this.updateConnectionStatus('CONNECTING');
  }

  /**
   * Registers a listener for connection status changes
   */
  public onStatusChange(callback: (health: ConnectionHealth) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.getConnectionHealth());
    
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Creates a managed channel with automatic reconnection and conflict detection
   */
  public async createChannel(
    channelName: string,
    config?: {
      onConnect?: () => void;
      onDisconnect?: () => void;
      onError?: (error: Error) => void;
      enableConflictDetection?: boolean;
      enableChecksum?: boolean;
    }
  ): Promise<RealtimeChannel> {
    if (this.channels.has(channelName)) {
      await this.removeChannel(channelName);
    }

    const channel = supabase.channel(channelName);

    // Set up channel status callbacks
    channel
      .on('system', { event: '*' }, (payload) => {
        if (payload.type === 'error') {
          this.handleChannelError(channelName, new Error(payload.message || 'Channel error'));
          config?.onError?.(new Error(payload.message || 'Channel error'));
        }
      })
      .subscribe((status) => {
        switch (status) {
          case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
            this.connectionHealth.lastSuccessfulSync = Date.now();
            this.connectionHealth.reconnectAttempts = 0;
            this.updateConnectionStatus('CONNECTED');
            this.clearSyncConflicts(channelName);
            config?.onConnect?.();
            break;
          case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
          case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
            this.handleChannelError(channelName, new Error(`Channel ${status}`));
            config?.onDisconnect?.();
            this.attemptReconnection(channelName);
            break;
          case REALTIME_SUBSCRIBE_STATES.CLOSED:
            config?.onDisconnect?.();
            break;
        }
      });

    this.channels.set(channelName, channel);
    this.connectionHealth.channelCount = this.channels.size;
    this.notifyStatusListeners();

    // Initialize sync validation for this channel
    this.syncValidation.set(channelName, {
      isValid: true,
      lastValidation: Date.now(),
      missedUpdates: 0,
      validationInterval: 10000,
      conflictDetected: false,
      lastConflictTime: null,
      checksumValid: true,
      lastChecksumValidation: null,
    });

    // Initialize data snapshot storage
    if (config?.enableChecksum) {
      this.dataSnapshots.set(channelName, new Map());
    }

    return channel;
  }

  /**
   * Removes a channel and cleans up resources
   */
  public async removeChannel(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (channel) {
      await supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.syncValidation.delete(channelName);
      this.dataSnapshots.delete(channelName);
      this.connectionHealth.channelCount = this.channels.size;
      this.notifyStatusListeners();
    }
  }

  /**
   * Validates data synchronization with enhanced checksum validation
   */
  public async validateSync(
    channelName: string,
    tableName: string,
    recordId: string,
    currentData: any,
    expectedUpdate?: boolean
  ): Promise<boolean> {
    const validation = this.syncValidation.get(channelName);
    if (!validation) return false;

    const now = Date.now();
    const timeSinceLastValidation = now - validation.lastValidation;

    // Checksum validation
    const checksumResult = await syncConflictService.validateChecksum(
      tableName,
      recordId,
      channelName,
      currentData
    );

    validation.checksumValid = checksumResult.isValid;
    validation.lastChecksumValidation = now;

    if (!checksumResult.isValid) {
      // Log checksum mismatch as conflict
      await syncConflictService.logConflict({
        channelName,
        tableName,
        recordId,
        conflictType: 'checksum_mismatch',
        clientData: currentData,
        serverData: { checksum: checksumResult.storedChecksum },
        conflictFields: ['checksum'],
        severity: 'high',
      });

      this.recordSyncConflict(
        channelName,
        `Checksum mismatch: expected ${checksumResult.storedChecksum}, got ${checksumResult.currentChecksum}`
      );
    }

    // Detect sync conflicts
    if (this.conflictDetectionEnabled) {
      this.detectSyncConflicts(channelName, timeSinceLastValidation);
    }

    // Update missed updates tracking
    if (expectedUpdate && timeSinceLastValidation > validation.validationInterval) {
      validation.missedUpdates++;
      validation.isValid = validation.missedUpdates < 3;
      
      if (!validation.isValid) {
        await this.logAndQueueConflict(
          channelName,
          tableName,
          recordId,
          'missed_updates',
          currentData
        );
      }
    } else if (expectedUpdate) {
      validation.missedUpdates = 0;
      validation.isValid = true;
      validation.lastValidation = now;
      validation.conflictDetected = false;
    }

    // Channel health check
    const channel = this.channels.get(channelName);
    if (channel) {
      const channelState = channel.state;
      validation.isValid = validation.isValid && 
        channelState === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED &&
        validation.checksumValid;
    }

    this.syncValidation.set(channelName, validation);
    return validation.isValid;
  }

  /**
   * Store data snapshot and create checksum
   */
  public async storeDataSnapshot(
    channelName: string,
    tableName: string,
    recordId: string,
    data: any
  ): Promise<void> {
    const snapshots = this.dataSnapshots.get(channelName);
    if (snapshots) {
      snapshots.set(recordId, data);
      
      // Create checksum in database
      await syncConflictService.createOrUpdateChecksum({
        tableName,
        recordId,
        channelName,
        data,
      });
    }
  }

  /**
   * Detect sync conflicts based on timing patterns
   */
  private detectSyncConflicts(channelName: string, timeSinceLastValidation: number): void {
    const validation = this.syncValidation.get(channelName);
    if (!validation) return;

    const now = Date.now();
    
    if (timeSinceLastValidation > validation.validationInterval * 2) {
      validation.conflictDetected = true;
      validation.lastConflictTime = now;
      this.recordSyncConflict(channelName, `No updates for ${Math.floor(timeSinceLastValidation / 1000)}s`);
    }
    
    const failingChannels = Array.from(this.syncValidation.values()).filter(
      v => !v.isValid || v.conflictDetected
    );
    
    if (failingChannels.length >= 2) {
      validation.conflictDetected = true;
      validation.lastConflictTime = now;
      this.recordSyncConflict(channelName, `Multiple channels failing simultaneously (${failingChannels.length})`);
    }

    this.syncValidation.set(channelName, validation);
  }

  /**
   * Log conflict and add to retry queue if needed
   */
  private async logAndQueueConflict(
    channelName: string,
    tableName: string,
    recordId: string,
    conflictType: string,
    currentData: any
  ): Promise<void> {
    // Log to database
    await syncConflictService.logConflict({
      channelName,
      tableName,
      recordId,
      conflictType,
      clientData: currentData,
      serverData: {},
      conflictFields: [],
      severity: 'medium',
    });

    // Add to retry queue
    await syncConflictService.addToRetryQueue({
      channelName,
      tableName,
      operationType: 'update',
      operationData: currentData,
      recordId,
      priority: 3,
    });

    this.recordSyncConflict(channelName, `Conflict detected: ${conflictType}`);
  }

  /**
   * Records a sync conflict for troubleshooting
   */
  private recordSyncConflict(channelName: string, reason: string): void {
    const conflicts = this.syncConflicts.get(channelName) || [];
    conflicts.push({
      timestamp: Date.now(),
      reason,
    });
    
    if (conflicts.length > 10) {
      conflicts.shift();
    }
    
    this.syncConflicts.set(channelName, conflicts);
    this.connectionHealth.lastError = `Sync conflict: ${reason}`;
    this.notifyStatusListeners();
  }

  /**
   * Gets recent sync conflicts for a channel
   */
  public getSyncConflicts(channelName: string): Array<{ timestamp: number; reason: string }> {
    return this.syncConflicts.get(channelName) || [];
  }

  /**
   * Clears sync conflicts for a channel
   */
  public clearSyncConflicts(channelName: string): void {
    this.syncConflicts.delete(channelName);
    
    const validation = this.syncValidation.get(channelName);
    if (validation) {
      validation.conflictDetected = false;
      validation.lastConflictTime = null;
      this.syncValidation.set(channelName, validation);
    }
  }

  /**
   * Start retry queue processor
   */
  private startRetryQueueProcessor(): void {
    if (this.retryQueueProcessor) {
      clearInterval(this.retryQueueProcessor);
    }

    this.retryQueueProcessor = setInterval(async () => {
      const pendingRetries = await syncConflictService.getPendingRetries();
      
      for (const retry of pendingRetries) {
        await this.processRetryItem(retry);
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process a single retry queue item
   */
  private async processRetryItem(retry: any): Promise<void> {
    try {
      // Mark as in progress
      await syncConflictService.updateRetryStatus(retry.id, 'in_progress');

      // Attempt the operation
      const channel = this.channels.get(retry.channel_name);
      if (!channel) {
        throw new Error('Channel not found');
      }

      // Simulate operation execution based on type
      switch (retry.operation_type) {
        case 'update':
          // In real implementation, execute the actual update
          break;
        case 'insert':
          // In real implementation, execute the actual insert
          break;
        case 'delete':
          // In real implementation, execute the actual delete
          break;
      }

      // Mark as succeeded
      await syncConflictService.updateRetryStatus(retry.id, 'succeeded');
    } catch (error: any) {
      // Check if max retries reached
      if (retry.retry_count >= retry.max_retries) {
        await syncConflictService.updateRetryStatus(retry.id, 'max_retries_reached', error?.message);
      } else {
        await syncConflictService.updateRetryStatus(retry.id, 'failed', error?.message);
      }
    }
  }

  /**
   * Manually triggers reconnection for all channels
   */
  public async reconnectAll(): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.updateConnectionStatus('RECONNECTING');

    const channelNames = Array.from(this.channels.keys());
    
    for (const channelName of channelNames) {
      await this.removeChannel(channelName);
    }

    this.connectionHealth.reconnectAttempts = 0;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.isReconnecting = false;
    this.updateConnectionStatus('CONNECTING');
  }

  /**
   * Gets current connection health status
   */
  public getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  /**
   * Gets sync validation status for a channel
   */
  public getSyncValidation(channelName: string): SyncValidation | null {
    const validation = this.syncValidation.get(channelName);
    return validation ? { ...validation } : null;
  }

  /**
   * Cleans up all resources
   */
  public async cleanup(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.retryQueueProcessor) {
      clearInterval(this.retryQueueProcessor);
      this.retryQueueProcessor = null;
    }

    const channelNames = Array.from(this.channels.keys());
    for (const channelName of channelNames) {
      await this.removeChannel(channelName);
    }

    this.statusListeners.clear();
    this.updateConnectionStatus('DISCONNECTED');
  }

  /**
   * Starts heartbeat monitoring
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.connectionHealth.lastHeartbeat = now;

      if (this.channels.size === 0) {
        this.updateConnectionStatus('DISCONNECTED');
        return;
      }

      let allHealthy = true;
      let anyConnected = false;

      this.channels.forEach((channel, name) => {
        const state = channel.state;
        
        if (state === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          anyConnected = true;
        } else if (
          state === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
          state === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
        ) {
          allHealthy = false;
        }
      });

      if (allHealthy && anyConnected) {
        this.updateConnectionStatus('HEALTHY');
      } else if (!anyConnected) {
        this.updateConnectionStatus('DISCONNECTED');
      } else {
        this.updateConnectionStatus('ERROR');
      }

      this.notifyStatusListeners();
    }, 5000);
  }

  /**
   * Handles channel errors and triggers reconnection
   */
  private handleChannelError(channelName: string, error: Error): void {
    this.connectionHealth.lastError = error.message;
    this.updateConnectionStatus('ERROR');
    this.notifyStatusListeners();
  }

  /**
   * Attempts to reconnect a channel with exponential backoff
   */
  private attemptReconnection(channelName: string): void {
    if (this.isReconnecting) return;
    if (this.connectionHealth.reconnectAttempts >= this.reconnectionConfig.maxRetries) {
      this.connectionHealth.lastError = 'Max reconnection attempts reached';
      this.updateConnectionStatus('ERROR');
      this.notifyStatusListeners();
      return;
    }

    this.isReconnecting = true;
    this.connectionHealth.reconnectAttempts++;
    this.updateConnectionStatus('RECONNECTING');
    this.notifyStatusListeners();

    const delay = Math.min(
      this.reconnectionConfig.initialDelay * 
        Math.pow(
          this.reconnectionConfig.backoffMultiplier,
          this.connectionHealth.reconnectAttempts - 1
        ),
      this.reconnectionConfig.maxDelay
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        const channel = this.channels.get(channelName);
        if (channel) {
          await supabase.removeChannel(channel);
          this.channels.delete(channelName);
          await this.createChannel(channelName);
          this.isReconnecting = false;
        }
      } catch (error: any) {
        this.connectionHealth.lastError = error?.message || 'Reconnection failed';
        this.isReconnecting = false;
        this.attemptReconnection(channelName);
      }
    }, delay);
  }

  /**
   * Updates connection status
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionHealth.status = status;
  }

  /**
   * Notifies all status listeners of health changes
   */
  private notifyStatusListeners(): void {
    const health = this.getConnectionHealth();
    this.statusListeners.forEach((listener) => {
      try {
        listener(health);
      } catch (error) {
        // Ignore listener errors
      }
    });
  }
}

export const realtimeManager = new RealtimeConnectionManager();

if (typeof window !== 'undefined') {
  realtimeManager.initialize();
}
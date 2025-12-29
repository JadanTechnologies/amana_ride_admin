import { supabase } from '@/lib/supabase';

/**
 * Types for sync conflict resolution
 */
export type ConflictResolutionStrategy =
  | 'client_wins' |'server_wins' |'latest_timestamp_wins' |'manual_resolution_required' |'merge_changes';

export type SyncRetryStatus =
  | 'pending' |'in_progress' |'succeeded' |'failed' |'max_retries_reached' |'cancelled';

export type DataValidationStatus =
  | 'valid' |'invalid' |'checksum_mismatch' |'missing_data' |'corrupted';

export interface SyncConflictLog {
  id: string;
  channel_name: string;
  table_name: string;
  record_id: string | null;
  conflict_type: string;
  client_version: string | null;
  server_version: string | null;
  client_data: any;
  server_data: any;
  conflict_fields: string[];
  resolution_strategy: ConflictResolutionStrategy;
  resolution_data: any;
  resolved_by: string | null;
  resolved_at: string | null;
  detected_at: string;
  severity: string;
  auto_resolved: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncRetryQueueItem {
  id: string;
  channel_name: string;
  table_name: string;
  operation_type: string;
  operation_data: any;
  record_id: string | null;
  retry_count: number;
  max_retries: number;
  retry_delay_ms: number;
  exponential_backoff: boolean;
  backoff_multiplier: number;
  status: SyncRetryStatus;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  last_error: string | null;
  error_count: number;
  priority: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DataValidationChecksum {
  id: string;
  table_name: string;
  record_id: string;
  channel_name: string;
  checksum: string;
  checksum_algorithm: string;
  data_snapshot: any;
  validation_status: DataValidationStatus;
  last_validated_at: string;
  validation_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConflictResolutionPolicy {
  id: string;
  policy_name: string;
  table_name: string;
  conflict_type: string;
  resolution_strategy: ConflictResolutionStrategy;
  auto_resolve: boolean;
  priority: number;
  match_conditions: any;
  on_conflict_actions: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Service for managing sync conflicts, retries, and data validation
 */
class SyncConflictService {
  /**
   * Log a sync conflict
   */
  async logConflict(conflictData: {
    channelName: string;
    tableName: string;
    recordId?: string;
    conflictType: string;
    clientData: any;
    serverData: any;
    conflictFields: string[];
    severity?: string;
    notes?: string;
  }): Promise<SyncConflictLog | null> {
    try {
      const { data, error } = await supabase
        .from('sync_conflict_logs')
        .insert({
          channel_name: conflictData.channelName,
          table_name: conflictData.tableName,
          record_id: conflictData.recordId || null,
          conflict_type: conflictData.conflictType,
          client_data: conflictData.clientData,
          server_data: conflictData.serverData,
          conflict_fields: conflictData.conflictFields,
          severity: conflictData.severity || 'medium',
          notes: conflictData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error logging sync conflict:', error);
      return null;
    }
  }

  /**
   * Get unresolved conflicts for a channel
   */
  async getUnresolvedConflicts(channelName?: string): Promise<SyncConflictLog[]> {
    try {
      let query = supabase
        .from('sync_conflict_logs')
        .select('*')
        .is('resolved_at', null)
        .order('detected_at', { ascending: false });

      if (channelName) {
        query = query.eq('channel_name', channelName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching unresolved conflicts:', error);
      return [];
    }
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(
    conflictId: string,
    resolutionData: any,
    resolvedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sync_conflict_logs')
        .update({
          resolution_data: resolutionData,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', conflictId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error resolving conflict:', error);
      return false;
    }
  }

  /**
   * Add operation to retry queue
   */
  async addToRetryQueue(retryData: {
    channelName: string;
    tableName: string;
    operationType: string;
    operationData: any;
    recordId?: string;
    priority?: number;
    maxRetries?: number;
  }): Promise<SyncRetryQueueItem | null> {
    try {
      const { data, error } = await supabase
        .from('sync_retry_queue')
        .insert({
          channel_name: retryData.channelName,
          table_name: retryData.tableName,
          operation_type: retryData.operationType,
          operation_data: retryData.operationData,
          record_id: retryData.recordId || null,
          priority: retryData.priority || 5,
          max_retries: retryData.maxRetries || 5,
          next_retry_at: new Date(Date.now() + 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error adding to retry queue:', error);
      return null;
    }
  }

  /**
   * Get pending retry items
   */
  async getPendingRetries(channelName?: string): Promise<SyncRetryQueueItem[]> {
    try {
      let query = supabase
        .from('sync_retry_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('next_retry_at', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });

      if (channelName) {
        query = query.eq('channel_name', channelName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching pending retries:', error);
      return [];
    }
  }

  /**
   * Update retry item status
   */
  async updateRetryStatus(
    retryId: string,
    status: SyncRetryStatus,
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        last_attempt_at: new Date().toISOString(),
      };

      if (errorMessage) {
        updateData.last_error = errorMessage;
        updateData.error_count = supabase.rpc('increment', { row_id: retryId });
      }

      if (status === 'succeeded' || status === 'max_retries_reached' || status === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'failed') {
        // Calculate next retry time (will be done by database function)
        updateData.retry_count = supabase.rpc('increment', { row_id: retryId });
      }

      const { error } = await supabase
        .from('sync_retry_queue')
        .update(updateData)
        .eq('id', retryId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error updating retry status:', error);
      return false;
    }
  }

  /**
   * Generate checksum for data
   */
  generateChecksum(data: any): string {
    // Simple hash generation (in production, use a proper crypto library)
    const jsonString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Create or update data validation checksum
   */
  async createOrUpdateChecksum(checksumData: {
    tableName: string;
    recordId: string;
    channelName: string;
    data: any;
  }): Promise<DataValidationChecksum | null> {
    try {
      const checksum = this.generateChecksum(checksumData.data);

      const { data, error } = await supabase
        .from('data_validation_checksums')
        .upsert(
          {
            table_name: checksumData.tableName,
            record_id: checksumData.recordId,
            channel_name: checksumData.channelName,
            checksum,
            data_snapshot: checksumData.data,
            last_validated_at: new Date().toISOString(),
            validation_status: 'valid',
          },
          {
            onConflict: 'table_name,record_id,channel_name',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error creating/updating checksum:', error);
      return null;
    }
  }

  /**
   * Validate data against stored checksum
   */
  async validateChecksum(
    tableName: string,
    recordId: string,
    channelName: string,
    currentData: any
  ): Promise<{ isValid: boolean; storedChecksum: string | null; currentChecksum: string }> {
    try {
      // Get stored checksum
      const { data: stored, error } = await supabase
        .from('data_validation_checksums')
        .select('checksum')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .eq('channel_name', channelName)
        .single();

      if (error) {
        return {
          isValid: false,
          storedChecksum: null,
          currentChecksum: this.generateChecksum(currentData),
        };
      }

      const currentChecksum = this.generateChecksum(currentData);
      const isValid = stored?.checksum === currentChecksum;

      // Update validation status
      if (!isValid && stored) {
        await supabase
          .from('data_validation_checksums')
          .update({
            validation_status: 'checksum_mismatch',
            validation_error: 'Data checksum does not match stored value',
            last_validated_at: new Date().toISOString(),
          })
          .eq('table_name', tableName)
          .eq('record_id', recordId)
          .eq('channel_name', channelName);
      }

      return {
        isValid,
        storedChecksum: stored?.checksum || null,
        currentChecksum,
      };
    } catch (error: any) {
      console.error('Error validating checksum:', error);
      return {
        isValid: false,
        storedChecksum: null,
        currentChecksum: this.generateChecksum(currentData),
      };
    }
  }

  /**
   * Get active resolution policies for a table
   */
  async getResolutionPolicies(tableName?: string): Promise<ConflictResolutionPolicy[]> {
    try {
      let query = supabase
        .from('conflict_resolution_policies')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (tableName) {
        query = query.eq('table_name', tableName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching resolution policies:', error);
      return [];
    }
  }

  /**
   * Get conflict statistics for a channel
   */
  async getConflictStats(channelName: string): Promise<{
    total: number;
    resolved: number;
    unresolved: number;
    autoResolved: number;
    bySeverity: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('sync_conflict_logs')
        .select('severity, resolved_at, auto_resolved')
        .eq('channel_name', channelName);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        resolved: data?.filter((c) => c.resolved_at)?.length || 0,
        unresolved: data?.filter((c) => !c.resolved_at)?.length || 0,
        autoResolved: data?.filter((c) => c.auto_resolved)?.length || 0,
        bySeverity: {} as Record<string, number>,
      };

      // Count by severity
      data?.forEach((conflict) => {
        const severity = conflict.severity || 'unknown';
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
      });

      return stats;
    } catch (error: any) {
      console.error('Error fetching conflict stats:', error);
      return {
        total: 0,
        resolved: 0,
        unresolved: 0,
        autoResolved: 0,
        bySeverity: {},
      };
    }
  }
}

export const syncConflictService = new SyncConflictService();
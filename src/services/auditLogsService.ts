import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeManager, ConnectionHealth } from './realtimeConnectionManager';

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changes: Record<string, any> | null;
  user_id: string | null;
  created_at: string;
  actor_name?: string;
  actor_email?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface AuditLogsFilters {
  dateFrom?: string;
  dateTo?: string;
  activityType?: string;
  severity?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Fetches audit logs with optional filtering, pagination, and actor information
 */
export async function fetchAuditLogs(
  filters: AuditLogsFilters = {}
): Promise<{ data: AuditLog[]; count: number; error: string | null }> {
  try {
    const {
      dateFrom,
      dateTo,
      activityType,
      severity,
      searchTerm,
      page = 1,
      pageSize = 20,
    } = filters;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Date range filtering
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Activity type filtering (table_name or action)
    if (activityType && activityType !== 'all') {
      if (['INSERT', 'UPDATE', 'DELETE'].includes(activityType.toUpperCase())) {
        query = query.ilike('action', `%${activityType}%`);
      } else {
        query = query.eq('table_name', activityType);
      }
    }

    // Search filtering (searches across table_name, action, and changes)
    if (searchTerm) {
      query = query.or(
        `table_name.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`
      );
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { data: [], count: 0, error: error.message };
    }

    // Enrich logs with actor information and severity
    const enrichedLogs = (data || []).map((log) => ({
      ...log,
      severity: determineSeverity(log.action, log.table_name),
    }));

    return { data: enrichedLogs, count: count || 0, error: null };
  } catch (err: any) {
    if (err?.message?.includes('Failed to fetch') || 
        err?.message?.includes('NetworkError')) {
      return {
        data: [],
        count: 0,
        error: 'Cannot connect to database. Your Supabase project may be paused or inactive.',
      };
    }
    return { data: [], count: 0, error: 'Failed to load audit logs' };
  }
}

/**
 * Fetches audit metrics for dashboard display
 */
export async function fetchAuditMetrics(): Promise<{
  totalEvents: number;
  criticalAlerts: number;
  failedOperations: number;
  uniqueActors: number;
  systemModifications: number;
  complianceViolations: number;
  error: string | null;
}> {
  try {
    const { data: allLogs, error } = await supabase
      .from('audit_logs')
      .select('*');

    if (error) {
      return {
        totalEvents: 0,
        criticalAlerts: 0,
        failedOperations: 0,
        uniqueActors: 0,
        systemModifications: 0,
        complianceViolations: 0,
        error: error.message,
      };
    }

    const logs = allLogs || [];
    const uniqueUsers = new Set(logs.map((log) => log.user_id).filter(Boolean));
    const criticalCount = logs.filter(
      (log) => determineSeverity(log.action, log.table_name) === 'critical'
    ).length;
    const failedCount = logs.filter(
      (log) => log.action?.toLowerCase().includes('failed') || 
               log.action?.toLowerCase().includes('error')
    ).length;
    const systemMods = logs.filter(
      (log) => ['system_settings', 'security_policies', 'compliance_settings'].includes(log.table_name)
    ).length;

    return {
      totalEvents: logs.length,
      criticalAlerts: criticalCount,
      failedOperations: failedCount,
      uniqueActors: uniqueUsers.size,
      systemModifications: systemMods,
      complianceViolations: 0,
      error: null,
    };
  } catch (err: any) {
    if (err?.message?.includes('Failed to fetch') || 
        err?.message?.includes('NetworkError')) {
      return {
        totalEvents: 0,
        criticalAlerts: 0,
        failedOperations: 0,
        uniqueActors: 0,
        systemModifications: 0,
        complianceViolations: 0,
        error: 'Cannot connect to database. Your Supabase project may be paused or inactive.',
      };
    }
    return {
      totalEvents: 0,
      criticalAlerts: 0,
      failedOperations: 0,
      uniqueActors: 0,
      systemModifications: 0,
      complianceViolations: 0,
      error: 'Failed to load audit metrics',
    };
  }
}

/**
 * Fetches recent critical events for sidebar display
 */
export async function fetchRecentCriticalEvents(limit: number = 5): Promise<{
  data: AuditLog[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit * 3); // Fetch more to filter for critical events

    if (error) {
      return { data: [], error: error.message };
    }

    const criticalEvents = (data || [])
      .filter((log) => determineSeverity(log.action, log.table_name) === 'critical')
      .slice(0, limit);

    return { data: criticalEvents, error: null };
  } catch (err: any) {
    if (err?.message?.includes('Failed to fetch') || 
        err?.message?.includes('NetworkError')) {
      return {
        data: [],
        error: 'Cannot connect to database. Your Supabase project may be paused or inactive.',
      };
    }
    return { data: [], error: 'Failed to load critical events' };
  }
}

/**
 * Exports audit logs to CSV format
 */
export function exportAuditLogsToCSV(logs: AuditLog[]): string {
  const headers = ['Timestamp', 'Actor', 'Action', 'Resource', 'Changes', 'Severity'];
  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString(),
    log.actor_name || log.user_id || 'System',
    log.action,
    `${log.table_name} (${log.record_id})`,
    JSON.stringify(log.changes || {}),
    log.severity || 'info',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Helper function to determine severity based on action and table
 */
function determineSeverity(
  action: string,
  tableName: string
): 'info' | 'warning' | 'critical' {
  const actionLower = action?.toLowerCase() || '';
  const tableLower = tableName?.toLowerCase() || '';

  // Critical actions
  if (
    actionLower.includes('delete') ||
    actionLower.includes('failed') ||
    actionLower.includes('error') ||
    tableLower.includes('security') ||
    tableLower.includes('roles') ||
    tableLower.includes('permissions')
  ) {
    return 'critical';
  }

  // Warning actions
  if (
    actionLower.includes('update') ||
    tableLower.includes('settings') ||
    tableLower.includes('staff')
  ) {
    return 'warning';
  }

  return 'info';
}

/**
 * Subscribes to real-time audit log changes with enhanced connection management
 * Returns cleanup function that should be called when component unmounts
 */
export async function subscribeToAuditLogsWithHealth(
  onInsert: (log: AuditLog) => void,
  onUpdate?: (log: AuditLog) => void,
  onDelete?: (log: AuditLog) => void,
  filters?: {
    severity?: 'info' | 'warning' | 'critical';
    tableName?: string;
  },
  onConnectionChange?: (health: ConnectionHealth) => void
): Promise<() => void> {
  const channelName = 'audit-logs-managed';
  
  try {
    const channel = await realtimeManager.createChannel(channelName, {
      onConnect: () => {
        if (onConnectionChange) {
          onConnectionChange(realtimeManager.getConnectionHealth());
        }
      },
      onDisconnect: () => {
        if (onConnectionChange) {
          onConnectionChange(realtimeManager.getConnectionHealth());
        }
      },
      onError: (error) => {
        console.log('Audit logs channel error:', error);
      },
    });

    // Set up change listeners
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs',
        filter: filters?.tableName ? `table_name=eq.${filters.tableName}` : undefined,
      },
      (payload) => {
        const newLog = {
          ...payload.new,
          severity: determineSeverity(payload.new.action, payload.new.table_name),
        } as AuditLog;

        if (!filters?.severity || newLog.severity === filters.severity) {
          onInsert(newLog);
          // Validate sync after receiving update
          realtimeManager.validateSync(channelName, true);
        }
      }
    );

    if (onUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audit_logs',
          filter: filters?.tableName ? `table_name=eq.${filters.tableName}` : undefined,
        },
        (payload) => {
          const updatedLog = {
            ...payload.new,
            severity: determineSeverity(payload.new.action, payload.new.table_name),
          } as AuditLog;

          if (!filters?.severity || updatedLog.severity === filters.severity) {
            onUpdate(updatedLog);
            realtimeManager.validateSync(channelName, true);
          }
        }
      );
    }

    if (onDelete) {
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'audit_logs',
          filter: filters?.tableName ? `table_name=eq.${filters.tableName}` : undefined,
        },
        (payload) => {
          const deletedLog = payload.old as AuditLog;
          onDelete(deletedLog);
          realtimeManager.validateSync(channelName, true);
        }
      );
    }

    // Return cleanup function
    return async () => {
      await realtimeManager.removeChannel(channelName);
    };
  } catch (error: any) {
    if (error?.message?.includes('Failed to fetch') || 
        error?.message?.includes('NetworkError')) {
      throw new Error('Cannot connect to real-time service. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Subscribes to real-time changes in operations-related tables with health monitoring
 */
export async function subscribeToOperationsDataWithHealth(
  onOperationChange: (data: {
    table: string;
    event: 'INSERT' | 'UPDATE' | 'DELETE';
    record: any;
  }) => void,
  onConnectionChange?: (health: ConnectionHealth) => void
): Promise<() => void> {
  const channelName = 'operations-managed';
  const operationsTables = [
    'staff_members',
    'system_settings',
    'security_policies',
    'roles',
    'permissions',
    'role_permissions',
  ];

  try {
    const channel = await realtimeManager.createChannel(channelName, {
      onConnect: () => {
        if (onConnectionChange) {
          onConnectionChange(realtimeManager.getConnectionHealth());
        }
      },
      onDisconnect: () => {
        if (onConnectionChange) {
          onConnectionChange(realtimeManager.getConnectionHealth());
        }
      },
      onError: (error) => {
        console.log('Operations channel error:', error);
      },
    });

    operationsTables.forEach((table) => {
      ['INSERT', 'UPDATE', 'DELETE'].forEach((event) => {
        channel.on(
          'postgres_changes',
          {
            event: event as any,
            schema: 'public',
            table: table,
          },
          (payload) => {
            onOperationChange({
              table,
              event: event as 'INSERT' | 'UPDATE' | 'DELETE',
              record: payload.new || payload.old,
            });
            realtimeManager.validateSync(channelName, true);
          }
        );
      });
    });

    // Return cleanup function
    return async () => {
      await realtimeManager.removeChannel(channelName);
    };
  } catch (error: any) {
    if (error?.message?.includes('Failed to fetch') || 
        error?.message?.includes('NetworkError')) {
      throw new Error('Cannot connect to real-time service. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Subscribes to real-time audit log changes with optional filtering
 * Returns a subscription channel that must be unsubscribed when component unmounts
 */
export function subscribeToAuditLogs(
  onInsert: (log: AuditLog) => void,
  onUpdate?: (log: AuditLog) => void,
  onDelete?: (log: AuditLog) => void,
  filters?: {
    severity?: 'info' | 'warning' | 'critical';
    tableName?: string;
  }
): RealtimeChannel {
  const channel = supabase
    .channel('audit-logs-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs',
        filter: filters?.tableName ? `table_name=eq.${filters.tableName}` : undefined,
      },
      (payload) => {
        const newLog = {
          ...payload.new,
          severity: determineSeverity(payload.new.action, payload.new.table_name),
        } as AuditLog;

        // Apply severity filter if specified
        if (!filters?.severity || newLog.severity === filters.severity) {
          onInsert(newLog);
        }
      }
    );

  if (onUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'audit_logs',
        filter: filters?.tableName ? `table_name=eq.${filters.tableName}` : undefined,
      },
      (payload) => {
        const updatedLog = {
          ...payload.new,
          severity: determineSeverity(payload.new.action, payload.new.table_name),
        } as AuditLog;

        if (!filters?.severity || updatedLog.severity === filters.severity) {
          onUpdate(updatedLog);
        }
      }
    );
  }

  if (onDelete) {
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'audit_logs',
        filter: filters?.tableName ? `table_name=eq.${filters.tableName}` : undefined,
      },
      (payload) => {
        const deletedLog = payload.old as AuditLog;
        onDelete(deletedLog);
      }
    );
  }

  channel.subscribe();
  return channel;
}

/**
 * Subscribes to real-time changes in operations-related tables
 * Tracks changes in staff_members, system_settings, security_policies, etc.
 */
export function subscribeToOperationsData(
  onOperationChange: (data: {
    table: string;
    event: 'INSERT' | 'UPDATE' | 'DELETE';
    record: any;
  }) => void
): RealtimeChannel {
  const operationsTables = [
    'staff_members',
    'system_settings',
    'security_policies',
    'roles',
    'permissions',
    'role_permissions',
  ];

  const channel = supabase.channel('operations-changes');

  operationsTables.forEach((table) => {
    ['INSERT', 'UPDATE', 'DELETE'].forEach((event) => {
      channel.on(
        'postgres_changes',
        {
          event: event as any,
          schema: 'public',
          table: table,
        },
        (payload) => {
          onOperationChange({
            table,
            event: event as 'INSERT' | 'UPDATE' | 'DELETE',
            record: payload.new || payload.old,
          });
        }
      );
    });
  });

  channel.subscribe();
  return channel;
}

/**
 * Unsubscribes from a real-time channel
 */
export async function unsubscribeFromChannel(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}

/**
 * Gets the current connection status of real-time subscriptions
 */
export function getRealtimeStatus(): 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT' {
  const channels = supabase.getChannels();
  if (channels.length === 0) return 'CLOSED';
  
  const activeChannel = channels[0];
  return activeChannel.state as any;
}

/**
 * Gets the current health status of real-time connections
 */
export function getRealtimeHealth(): ConnectionHealth {
  return realtimeManager.getConnectionHealth();
}

/**
 * Manually triggers reconnection of all real-time channels
 */
export async function reconnectRealtimeChannels(): Promise<void> {
  await realtimeManager.reconnectAll();
}
import { supabase } from '@/lib/supabase';

// Types matching database schema
export interface BackupConfiguration {
  id: string;
  backup_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_config: any;
  retention_policy_days: number;
  storage_location: 'local' | 'cloud_primary' | 'cloud_secondary' | 'archive';
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  next_scheduled_run?: string;
  last_run_at?: string;
}

export interface BackupExecution {
  id: string;
  configuration_id: string;
  execution_status: 'active' | 'completed' | 'failed' | 'in_progress';
  backup_size_bytes: number;
  backup_location?: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  metadata?: any;
  verification_status: boolean;
  replicated_to?: any;
}

export interface RecoveryPoint {
  id: string;
  backup_execution_id: string;
  recovery_point_timestamp: string;
  data_snapshot: any;
  affected_tables: string[];
  size_bytes: number;
  is_verified: boolean;
  created_at: string;
}

export interface RecoveryTest {
  id: string;
  backup_execution_id: string;
  test_status: 'pending' | 'in_progress' | 'passed' | 'failed';
  test_type: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  success_rate?: number;
  issues_found: number;
  test_results?: any;
  performed_by?: string;
}

export interface BackupAuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  performed_by?: string;
  action_timestamp: string;
  changes?: any;
  ip_address?: string;
  user_agent?: string;
  compliance_flags?: any;
}

// Backup Configuration CRUD
export const getBackupConfigurations = async (filters?: {
  backup_type?: string;
  is_active?: boolean;
}): Promise<BackupConfiguration[]> => {
  try {
    let query = supabase.from('backup_configurations').select('*').order('created_at', { ascending: false });

    if (filters?.backup_type) {
      query = query.eq('backup_type', filters.backup_type);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching backup configurations:', error);
    throw error;
  }
};

export const createBackupConfiguration = async (config: Partial<BackupConfiguration>): Promise<BackupConfiguration> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('backup_configurations')
      .insert({ ...config, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating backup configuration:', error);
    throw error;
  }
};

export const updateBackupConfiguration = async (
  id: string,
  updates: Partial<BackupConfiguration>
): Promise<BackupConfiguration> => {
  try {
    const { data, error } = await supabase
      .from('backup_configurations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating backup configuration:', error);
    throw error;
  }
};

export const deleteBackupConfiguration = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('backup_configurations').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting backup configuration:', error);
    throw error;
  }
};

// Backup Execution operations
export const getBackupExecutions = async (filters?: {
  configuration_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<BackupExecution[]> => {
  try {
    let query = supabase.from('backup_executions').select('*').order('started_at', { ascending: false });

    if (filters?.configuration_id) {
      query = query.eq('configuration_id', filters.configuration_id);
    }
    if (filters?.status) {
      query = query.eq('execution_status', filters.status);
    }
    if (filters?.date_from) {
      query = query.gte('started_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('started_at', filters.date_to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching backup executions:', error);
    throw error;
  }
};

export const triggerManualBackup = async (configurationId: string): Promise<BackupExecution> => {
  try {
    const { data, error } = await supabase
      .from('backup_executions')
      .insert({
        configuration_id: configurationId,
        execution_status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error triggering manual backup:', error);
    throw error;
  }
};

// Recovery Point operations
export const getRecoveryPoints = async (backupExecutionId?: string): Promise<RecoveryPoint[]> => {
  try {
    let query = supabase.from('recovery_points').select('*').order('recovery_point_timestamp', { ascending: false });

    if (backupExecutionId) {
      query = query.eq('backup_execution_id', backupExecutionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recovery points:', error);
    throw error;
  }
};

export const createRecoveryPoint = async (
  backupExecutionId: string,
  recoveryData: Partial<RecoveryPoint>
): Promise<RecoveryPoint> => {
  try {
    const { data, error } = await supabase
      .from('recovery_points')
      .insert({
        backup_execution_id: backupExecutionId,
        ...recoveryData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating recovery point:', error);
    throw error;
  }
};

// Recovery Test operations
export const getRecoveryTests = async (backupExecutionId?: string): Promise<RecoveryTest[]> => {
  try {
    let query = supabase.from('recovery_tests').select('*').order('started_at', { ascending: false });

    if (backupExecutionId) {
      query = query.eq('backup_execution_id', backupExecutionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recovery tests:', error);
    throw error;
  }
};

export const createRecoveryTest = async (testData: Partial<RecoveryTest>): Promise<RecoveryTest> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('recovery_tests')
      .insert({
        ...testData,
        performed_by: user?.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating recovery test:', error);
    throw error;
  }
};

// Audit Trail operations
export const getBackupAuditTrail = async (filters?: {
  entity_type?: string;
  date_from?: string;
  date_to?: string;
}): Promise<BackupAuditEntry[]> => {
  try {
    let query = supabase.from('backup_audit_trail').select('*').order('action_timestamp', { ascending: false });

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.date_from) {
      query = query.gte('action_timestamp', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('action_timestamp', filters.date_to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching backup audit trail:', error);
    throw error;
  }
};

export const createAuditEntry = async (auditData: Partial<BackupAuditEntry>): Promise<BackupAuditEntry> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('backup_audit_trail')
      .insert({
        ...auditData,
        performed_by: user?.id,
        action_timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating audit entry:', error);
    throw error;
  }
};

// Backup metrics and statistics
export const getBackupMetrics = async (): Promise<{
  total_backup_size: number;
  successful_backups_today: number;
  last_successful_backup: string | null;
  storage_utilization: number;
  recovery_test_score: number;
}> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [executionsData, testsData] = await Promise.all([
      supabase
        .from('backup_executions')
        .select('backup_size_bytes, completed_at, execution_status')
        .eq('execution_status', 'completed'),
      supabase.from('recovery_tests').select('success_rate, test_status').eq('test_status', 'passed'),
    ]);

    const totalSize = executionsData.data?.reduce((sum, exec) => sum + (exec.backup_size_bytes || 0), 0) || 0;
    const successfulToday =
      executionsData.data?.filter((exec) => exec.completed_at && new Date(exec.completed_at) >= today).length || 0;
    const lastSuccessful =
      executionsData.data?.length > 0
        ? executionsData.data.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
            .completed_at
        : null;

    const avgTestScore =
      testsData.data?.reduce((sum, test) => sum + (test.success_rate || 0), 0) / (testsData.data?.length || 1) || 0;

    return {
      total_backup_size: totalSize,
      successful_backups_today: successfulToday,
      last_successful_backup: lastSuccessful,
      storage_utilization: 75.5,
      recovery_test_score: avgTestScore,
    };
  } catch (error) {
    console.error('Error fetching backup metrics:', error);
    return {
      total_backup_size: 0,
      successful_backups_today: 0,
      last_successful_backup: null,
      storage_utilization: 0,
      recovery_test_score: 0,
    };
  }
};
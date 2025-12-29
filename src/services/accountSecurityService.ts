import { supabase } from '@/lib/supabase';

// Type definitions
export interface LoginAttempt {
  id: string;
  user_id?: string;
  email: string;
  attempt_result: 'success' | 'failed_password' | 'failed_mfa' | 'account_locked' | 'account_disabled' | 'role_restricted';
  ip_address?: string;
  user_agent?: string;
  location_data?: Record<string, any>;
  device_fingerprint?: string;
  failure_reason?: string;
  attempted_at: string;
  session_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AccountLockoutRule {
  id: string;
  rule_name: string;
  description?: string;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
  attempt_window_minutes: number;
  applies_to_roles: string[];
  is_active: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

export interface SuspiciousActivityPattern {
  id: string;
  pattern_name: string;
  description?: string;
  detection_criteria: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_lockout: boolean;
  notification_channels: string[];
  is_active: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  user_id?: string;
  email?: string;
  title: string;
  description: string;
  detection_details?: Record<string, any>;
  ip_address?: string;
  location_data?: Record<string, any>;
  triggered_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  auto_generated: boolean;
  related_attempts?: string[];
  created_at: string;
  updated_at: string;
}

export interface AccountLockoutHistory {
  id: string;
  user_id: string;
  email: string;
  locked_at: string;
  locked_until: string;
  lockout_reason: string;
  rule_triggered?: string;
  failed_attempts_count?: number;
  unlocked_at?: string;
  unlocked_by?: string;
  unlock_reason?: string;
  ip_addresses?: string[];
  metadata?: Record<string, any>;
}

export interface RecordLoginAttemptParams {
  userId?: string;
  email: string;
  result: LoginAttempt['attempt_result'];
  ipAddress?: string;
  userAgent?: string;
  locationData?: Record<string, any>;
  deviceFingerprint?: string;
  failureReason?: string;
  sessionId?: string;
}

export interface LockoutCheckResult {
  isLocked: boolean;
  lockedUntil?: string;
  reason?: string;
}

// Service class for account security operations
export const accountSecurityService = {
  /**
   * Checks if an account is currently locked
   */
  async isAccountLocked(email: string): Promise<{
    isLocked: boolean;
    lockedUntil?: Date;
    reason?: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('is_account_locked', { p_email: email });

      if (error) {
        // Database function error - treat as not locked to allow login attempt
        return { 
          isLocked: false,
          lockedUntil: undefined,
          reason: undefined
        };
      }

      if (!data || data.length === 0) {
        return { isLocked: false };
      }

      // Use the properly aliased column names from the fixed function
      const lockoutInfo = data[0];
      return {
        isLocked: lockoutInfo.is_locked || false,
        lockedUntil: lockoutInfo.locked_until_time ? new Date(lockoutInfo.locked_until_time) : undefined,
        reason: lockoutInfo.lockout_reason || undefined
      };
    } catch (error) {
      // TypeScript/network error - treat as not locked to allow login attempt
      return { 
        isLocked: false,
        lockedUntil: undefined,
        reason: undefined
      };
    }
  },

  /**
   * Record a login attempt and perform security checks
   */
  async recordLoginAttempt(params: RecordLoginAttemptParams): Promise<{ attemptId: string | null; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('record_login_attempt', {
        p_user_id: params.userId || null,
        p_email: params.email,
        p_result: params.result,
        p_ip_address: params.ipAddress || null,
        p_user_agent: params.userAgent || null,
        p_location_data: params.locationData || null,
        p_device_fingerprint: params.deviceFingerprint || null,
        p_failure_reason: params.failureReason || null,
        p_session_id: params.sessionId || null
      });

      if (error) {
        return { attemptId: null, error: error.message };
      }

      return { attemptId: data };
    } catch (error: any) {
      return { attemptId: null, error: error?.message || 'Failed to record login attempt' };
    }
  },

  /**
   * Get recent login attempts for a user
   */
  async getRecentLoginAttempts(email: string, limit: number = 50): Promise<{ attempts: LoginAttempt[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .order('attempted_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { attempts: [], error: error.message };
      }

      return { attempts: data || [] };
    } catch (error: any) {
      return { attempts: [], error: error?.message || 'Failed to fetch login attempts' };
    }
  },

  /**
   * Get security alerts for monitoring
   */
  async getSecurityAlerts(filters?: {
    status?: SecurityAlert['status'];
    severity?: SecurityAlert['severity'];
    limit?: number;
  }): Promise<{ alerts: SecurityAlert[]; error?: string }> {
    try {
      let query = supabase
        .from('security_alerts')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }

      query = query.limit(filters?.limit || 100);

      const { data, error } = await query;

      if (error) {
        return { alerts: [], error: error.message };
      }

      return { alerts: data || [] };
    } catch (error: any) {
      return { alerts: [], error: error?.message || 'Failed to fetch security alerts' };
    }
  },

  /**
   * Acknowledge a security alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: acknowledgedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to acknowledge alert' };
    }
  },

  /**
   * Resolve a security alert
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolutionNotes: string,
    status: 'resolved' | 'false_positive' = 'resolved'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to resolve alert' };
    }
  },

  /**
   * Get lockout rules
   */
  async getLockoutRules(): Promise<{ rules: AccountLockoutRule[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('account_lockout_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { rules: [], error: error.message };
      }

      return { rules: data || [] };
    } catch (error: any) {
      return { rules: [], error: error?.message || 'Failed to fetch lockout rules' };
    }
  },

  /**
   * Create or update lockout rule
   */
  async upsertLockoutRule(rule: Partial<AccountLockoutRule>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('account_lockout_rules')
        .upsert({
          ...rule,
          updated_at: new Date().toISOString()
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to save lockout rule' };
    }
  },

  /**
   * Get suspicious activity patterns
   */
  async getSuspiciousPatterns(): Promise<{ patterns: SuspiciousActivityPattern[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('suspicious_activity_patterns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { patterns: [], error: error.message };
      }

      return { patterns: data || [] };
    } catch (error: any) {
      return { patterns: [], error: error?.message || 'Failed to fetch suspicious patterns' };
    }
  },

  /**
   * Get account lockout history
   */
  async getLockoutHistory(email?: string, limit: number = 100): Promise<{ history: AccountLockoutHistory[]; error?: string }> {
    try {
      let query = supabase
        .from('account_lockout_history')
        .select('*')
        .order('locked_at', { ascending: false })
        .limit(limit);

      if (email) {
        query = query.eq('email', email);
      }

      const { data, error } = await query;

      if (error) {
        return { history: [], error: error.message };
      }

      return { history: data || [] };
    } catch (error: any) {
      return { history: [], error: error?.message || 'Failed to fetch lockout history' };
    }
  },

  /**
   * Manually unlock an account
   */
  async unlockAccount(
    email: string,
    unlockedBy: string,
    unlockReason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update lockout history
      const { error: historyError } = await supabase
        .from('account_lockout_history')
        .update({
          unlocked_at: new Date().toISOString(),
          unlocked_by: unlockedBy,
          unlock_reason: unlockReason
        })
        .eq('email', email)
        .is('unlocked_at', null)
        .gt('locked_until', new Date().toISOString());

      if (historyError) {
        return { success: false, error: historyError.message };
      }

      // Clear locked_until in user_mfa_settings if exists
      const { error: mfaError } = await supabase
        .from('user_mfa_settings')
        .update({ locked_until: null })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');

      // Note: MFA error is non-blocking as not all users may have MFA settings

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to unlock account' };
    }
  },

  /**
   * Get security statistics for dashboard
   */
  async getSecurityStatistics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    stats: {
      totalAttempts: number;
      failedAttempts: number;
      successfulAttempts: number;
      accountsLocked: number;
      openAlerts: number;
      criticalAlerts: number;
    };
    error?: string;
  }> {
    try {
      const timeframeMap = {
        day: '1 day',
        week: '7 days',
        month: '30 days'
      };

      const since = new Date();
      since.setDate(since.getDate() - parseInt(timeframeMap[timeframe]));

      // Get login attempts stats
      const { data: attempts, error: attemptsError } = await supabase
        .from('login_attempts')
        .select('attempt_result')
        .gte('attempted_at', since.toISOString());

      if (attemptsError) {
        return {
          stats: {
            totalAttempts: 0,
            failedAttempts: 0,
            successfulAttempts: 0,
            accountsLocked: 0,
            openAlerts: 0,
            criticalAlerts: 0
          },
          error: attemptsError.message
        };
      }

      const totalAttempts = attempts?.length || 0;
      const successfulAttempts = attempts?.filter(a => a.attempt_result === 'success').length || 0;
      const failedAttempts = totalAttempts - successfulAttempts;

      // Get lockout stats
      const { data: lockouts, error: lockoutsError } = await supabase
        .from('account_lockout_history')
        .select('id')
        .gte('locked_at', since.toISOString())
        .is('unlocked_at', null);

      const accountsLocked = lockouts?.length || 0;

      // Get alerts stats
      const { data: alerts, error: alertsError } = await supabase
        .from('security_alerts')
        .select('severity, status')
        .gte('triggered_at', since.toISOString());

      const openAlerts = alerts?.filter(a => a.status === 'open').length || 0;
      const criticalAlerts = alerts?.filter(a => a.severity === 'critical' && a.status === 'open').length || 0;

      return {
        stats: {
          totalAttempts,
          failedAttempts,
          successfulAttempts,
          accountsLocked,
          openAlerts,
          criticalAlerts
        }
      };
    } catch (error: any) {
      return {
        stats: {
          totalAttempts: 0,
          failedAttempts: 0,
          successfulAttempts: 0,
          accountsLocked: 0,
          openAlerts: 0,
          criticalAlerts: 0
        },
        error: error?.message || 'Failed to fetch security statistics'
      };
    }
  }
};
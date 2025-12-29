import { supabase } from '@/lib/supabase';

export interface SystemSetting {
  id: string;
  category: 'general' | 'security' | 'notification' | 'compliance' | 'branding' | 'api';
  setting_key: string;
  setting_value: Record<string, any>;
  display_name: string;
  description?: string;
  is_encrypted: boolean;
  requires_restart: boolean;
  validation_rules?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SecurityPolicy {
  id: string;
  policy_name: string;
  policy_type: string;
  configuration: Record<string, any>;
  is_active: boolean;
  enforcement_level: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  last_modified_by?: string;
}

export interface NotificationPreference {
  id: string;
  preference_name: string;
  channel: 'email' | 'sms' | 'push' | 'webhook';
  is_enabled: boolean;
  configuration: Record<string, any>;
  recipient_roles: string[];
  escalation_rules?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ComplianceSetting {
  id: string;
  standard: 'gdpr' | 'hipaa' | 'soc2' | 'iso27001' | 'pci_dss';
  requirement_name: string;
  is_enabled: boolean;
  configuration: Record<string, any>;
  retention_period_days?: number;
  automated_checks?: Record<string, any>;
  last_audit_date?: string;
  next_audit_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandingSetting {
  id: string;
  element_name: string;
  element_type: string;
  configuration: Record<string, any>;
  asset_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface SettingsChangeHistory {
  id: string;
  setting_type: string;
  setting_id: string;
  previous_value?: Record<string, any>;
  new_value: Record<string, any>;
  change_reason?: string;
  changed_by?: string;
  changed_at: string;
  approved_by?: string;
  approval_status: string;
}

// System Settings Operations
export const getSystemSettings = async (category?: string) => {
  try {
    let query = supabase
      .from('system_settings')
      .select('*')
      .order('display_name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateSystemSetting = async (id: string, updates: Partial<SystemSetting>) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const createSystemSetting = async (setting: Omit<SystemSetting, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .insert([setting])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Security Policies Operations
export const getSecurityPolicies = async () => {
  try {
    const { data, error } = await supabase
      .from('security_policies')
      .select('*')
      .order('policy_name', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateSecurityPolicy = async (id: string, updates: Partial<SecurityPolicy>) => {
  try {
    const { data, error } = await supabase
      .from('security_policies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Notification Preferences Operations
export const getNotificationPreferences = async () => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .order('preference_name', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateNotificationPreference = async (id: string, updates: Partial<NotificationPreference>) => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Compliance Settings Operations
export const getComplianceSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('compliance_settings')
      .select('*')
      .order('standard', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateComplianceSetting = async (id: string, updates: Partial<ComplianceSetting>) => {
  try {
    const { data, error } = await supabase
      .from('compliance_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Branding Settings Operations
export const getBrandingSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .order('element_name', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateBrandingSetting = async (id: string, updates: Partial<BrandingSetting>) => {
  try {
    const { data, error } = await supabase
      .from('branding_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Settings Change History Operations
export const getSettingsChangeHistory = async (settingType?: string, limit: number = 50) => {
  try {
    let query = supabase
      .from('settings_change_history')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (settingType) {
      query = query.eq('setting_type', settingType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const createChangeHistoryEntry = async (entry: Omit<SettingsChangeHistory, 'id' | 'changed_at'>) => {
  try {
    const { data, error } = await supabase
      .from('settings_change_history')
      .insert([entry])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Backup and Restore Operations
export const exportConfiguration = async () => {
  try {
    const [settings, security, notifications, compliance, branding] = await Promise.all([
      getSystemSettings(),
      getSecurityPolicies(),
      getNotificationPreferences(),
      getComplianceSettings(),
      getBrandingSettings()
    ]);

    const configuration = {
      system_settings: settings.data,
      security_policies: security.data,
      notification_preferences: notifications.data,
      compliance_settings: compliance.data,
      branding_settings: branding.data,
      exported_at: new Date().toISOString()
    };

    return { data: configuration, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};
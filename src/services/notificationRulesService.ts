import { supabase } from '@/lib/supabase';

export interface NotificationRule {
  id?: string;
  rule_name: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: Record<string, any>;
  notification_channels: string[];
  escalation_config?: {
    levels: {
      level: number;
      delay_minutes: number;
      channels: string[];
    }[];
  };
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

class NotificationRulesService {
  /**
   * Get all notification rules
   */
  async getAllRules(): Promise<NotificationRule[]> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch notification rules: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error fetching notification rules:', error);
      throw error;
    }
  }

  /**
   * Get a single notification rule by ID
   */
  async getRuleById(ruleId: string): Promise<NotificationRule | null> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch notification rule: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching notification rule:', error);
      throw error;
    }
  }

  /**
   * Create a new notification rule
   */
  async createRule(rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationRule> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .insert([rule])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create notification rule: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error creating notification rule:', error);
      throw error;
    }
  }

  /**
   * Update an existing notification rule
   */
  async updateRule(ruleId: string, updates: Partial<NotificationRule>): Promise<NotificationRule> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .update(updates)
        .eq('id', ruleId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update notification rule: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error updating notification rule:', error);
      throw error;
    }
  }

  /**
   * Delete a notification rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        throw new Error(`Failed to delete notification rule: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error deleting notification rule:', error);
      throw error;
    }
  }

  /**
   * Get active rules for a specific severity level
   */
  async getActiveRulesBySeverity(severity: string): Promise<NotificationRule[]> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('severity', severity)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch rules by severity: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error fetching rules by severity:', error);
      throw error;
    }
  }

  /**
   * Toggle rule active status
   */
  async toggleRuleStatus(ruleId: string): Promise<NotificationRule> {
    try {
      // First get current status
      const rule = await this.getRuleById(ruleId);
      if (!rule) {
        throw new Error('Rule not found');
      }

      // Toggle status
      return await this.updateRule(ruleId, { is_active: !rule.is_active });
    } catch (error: any) {
      console.error('Error toggling rule status:', error);
      throw error;
    }
  }
}

export const notificationRulesService = new NotificationRulesService();
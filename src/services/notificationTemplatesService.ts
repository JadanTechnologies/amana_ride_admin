import { supabase } from '@/lib/supabase';
import { NotificationPriority, NotificationCategory } from './notificationHubService';

export type TemplateVariableType = 'text' | 'number' | 'date' | 'priority' | 'category' | 'user_name' | 'system_name';
export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type RuleOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in_list';
export type RuleActionType = 'send_notification' | 'escalate' | 'auto_acknowledge' | 'auto_resolve' | 'suppress';

export interface TemplateVariable {
  name: string;
  type: TemplateVariableType;
  description?: string;
  required?: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description: string | null;
  subject_template: string;
  body_template: string;
  default_priority: NotificationPriority;
  default_category: NotificationCategory;
  variables: TemplateVariable[];
  is_active: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface NotificationSchedule {
  id: string;
  name: string;
  template_id: string;
  frequency: ScheduleFrequency;
  start_date: string;
  end_date: string | null;
  schedule_config: Record<string, any>;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  recipient_roles: string[];
  template_variables: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: any;
}

export interface RuleAction {
  type: RuleActionType;
  config: Record<string, any>;
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  template_id: string | null;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  trigger_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export const notificationTemplatesService = {
  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  async getTemplates(): Promise<NotificationTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw error;
    }
  },

  async getTemplate(id: string): Promise<NotificationTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<NotificationTemplate> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  async updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  async renderTemplate(templateId: string, variables: Record<string, any>): Promise<{ subject: string; body: string }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) throw new Error('Template not found');

      const { data, error } = await supabase.rpc('render_notification_template', {
        template_text: template.subject_template,
        variables
      });

      if (error) throw error;

      const { data: bodyData, error: bodyError } = await supabase.rpc('render_notification_template', {
        template_text: template.body_template,
        variables
      });

      if (bodyError) throw bodyError;

      return {
        subject: data || template.subject_template,
        body: bodyData || template.body_template
      };
    } catch (error: any) {
      throw error;
    }
  },

  // ============================================================================
  // SCHEDULE MANAGEMENT
  // ============================================================================

  async getSchedules(): Promise<NotificationSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('notification_schedules')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw error;
    }
  },

  async getSchedule(id: string): Promise<NotificationSchedule | null> {
    try {
      const { data, error } = await supabase
        .from('notification_schedules')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  async createSchedule(schedule: Omit<NotificationSchedule, 'id' | 'created_at' | 'updated_at' | 'last_run_at'>): Promise<NotificationSchedule> {
    try {
      const { data, error } = await supabase
        .from('notification_schedules')
        .insert([schedule])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  async updateSchedule(id: string, updates: Partial<NotificationSchedule>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_schedules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  async getScheduleLogs(scheduleId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notification_schedule_logs')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw error;
    }
  },

  // ============================================================================
  // RULE MANAGEMENT
  // ============================================================================

  async getRules(): Promise<NotificationRule[]> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw error;
    }
  },

  async getRule(id: string): Promise<NotificationRule | null> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  async createRule(rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at' | 'last_triggered_at' | 'trigger_count'>): Promise<NotificationRule> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .insert([rule])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  async updateRule(id: string, updates: Partial<NotificationRule>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  async deleteRule(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  async getRuleLogs(ruleId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notification_rule_logs')
        .select('*')
        .eq('rule_id', ruleId)
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw error;
    }
  },

  async evaluateRule(ruleId: string, notificationData: Record<string, any>): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('evaluate_notification_rule', {
        rule_id: ruleId,
        notification_data: notificationData
      });

      if (error) throw error;
      return data || false;
    } catch (error: any) {
      throw error;
    }
  }
};
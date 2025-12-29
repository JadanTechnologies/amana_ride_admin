import { supabase } from '@/lib/supabase';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';
export type NotificationCategory = 'system' | 'operations' | 'security' | 'admin_messages';
export type NotificationStatus = 'unread' | 'read' | 'acknowledged' | 'resolved';

export interface SystemNotification {
  id: string;
  title: string;
  description: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  status: NotificationStatus;
  source_system: string | null;
  created_by: string | null;
  assigned_to: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationFilters {
  priorities?: NotificationPriority[];
  categories?: NotificationCategory[];
  statuses?: NotificationStatus[];
}

export interface NotificationMetrics {
  total_active: number;
  critical_count: number;
  unread_count: number;
  resolved_today: number;
  average_response_time: number;
  escalation_queue: number;
}

export const notificationHubService = {
  // Fetch all notifications with optional filters
  async getNotifications(filters?: NotificationFilters): Promise<SystemNotification[]> {
    try {
      let query = supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.priorities?.length) {
        query = query.in('priority', filters.priorities);
      }

      if (filters?.categories?.length) {
        query = query.in('category', filters.categories);
      }

      if (filters?.statuses?.length) {
        query = query.in('status', filters.statuses);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get notification metrics
  async getMetrics(): Promise<NotificationMetrics> {
    try {
      const { data: allNotifications, error } = await supabase
        .from('system_notifications')
        .select('*');

      if (error) {
        throw error;
      }

      const notifications = allNotifications || [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const metrics: NotificationMetrics = {
        total_active: notifications.filter(n => n.status !== 'resolved').length,
        critical_count: notifications.filter(n => n.priority === 'critical' && n.status !== 'resolved').length,
        unread_count: notifications.filter(n => n.status === 'unread').length,
        resolved_today: notifications.filter(n => {
          if (!n.resolved_at) return false;
          const resolvedDate = new Date(n.resolved_at);
          return resolvedDate >= today;
        }).length,
        average_response_time: 0, // Placeholder - would calculate from created_at to resolved_at
        escalation_queue: notifications.filter(n => n.priority === 'critical' && n.status === 'unread').length
      };

      return metrics;
    } catch (error: any) {
      console.error('Error fetching notification metrics:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Acknowledge notification
  async acknowledgeNotification(notificationId: string, staffMemberId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_notifications')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: staffMemberId
        })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error acknowledging notification:', error);
      throw error;
    }
  },

  // Resolve notification
  async resolveNotification(notificationId: string, staffMemberId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_notifications')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: staffMemberId
        })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error resolving notification:', error);
      throw error;
    }
  },

  // Bulk status update
  async bulkUpdateStatus(notificationIds: string[], status: NotificationStatus): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_notifications')
        .update({ status })
        .in('id', notificationIds);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error bulk updating notifications:', error);
      throw error;
    }
  },

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (payload: any) => void) {
    const channel = supabase
      .channel('system_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_notifications'
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
import { supabase } from '../lib/supabase';
import { 
  UserProfile, 
  UpdateUserProfile, 
  UserManagementFilters,
  AdminActionRequest,
  UserStatus,
  UserRole,
  AdminActionLog,
  AccountAction
} from '../types/user.types';

interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

interface UsersResponse {
  data: UserProfile[] | null;
  error: Error | null;
  count?: number;
}

export const userManagementService = {
  /**
   * Fetch all users with optional filtering and pagination
   */
  async getAllUsers(
    filters?: UserManagementFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<UsersResponse> {
    try {
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.searchQuery) {
        query = query.or(
          `full_name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%,phone.ilike.%${filters.searchQuery}%`
        );
      }

      if (filters?.userType && filters.userType !== 'all') {
        if (filters.userType === 'admin') {
          query = query.in('role', ['super_admin', 'operations', 'finance', 'support']);
        } else {
          query = query.eq('role', filters.userType);
        }
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply sorting
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      return { data, error, count: count ?? 0 };
    } catch (error) {
      return { 
        data: null, 
        error: error as Error,
        count: 0 
      };
    }
  },

  /**
   * Get single user by ID
   */
  async getUserById(userId: string): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Update user profile (super admin only)
   */
  async updateUser(
    userId: string,
    updates: Partial<UpdateUserProfile>
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Suspend user account
   */
  async suspendUser(
    request: AdminActionRequest
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current user data
      const { data: currentUser } = await this.getUserById(request.targetUserId);
      
      // Update user status
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          status: 'suspended' as UserStatus,
          suspended_at: new Date().toISOString(),
          suspended_by: user.id,
          suspension_reason: request.reason
        })
        .eq('id', request.targetUserId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log admin action
      await this.logAdminAction({
        admin_id: user.id,
        target_user_id: request.targetUserId,
        action: 'suspend' as AccountAction,
        reason: request.reason,
        previous_status: currentUser?.status || null,
        new_status: 'suspended' as UserStatus,
        metadata: request.metadata || {}
      });

      return { data: updatedUser, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Ban user account
   */
  async banUser(
    request: AdminActionRequest
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: currentUser } = await this.getUserById(request.targetUserId);

      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          status: 'banned' as UserStatus,
          banned_at: new Date().toISOString(),
          banned_by: user.id,
          ban_reason: request.reason
        })
        .eq('id', request.targetUserId)
        .select()
        .single();

      if (updateError) throw updateError;

      await this.logAdminAction({
        admin_id: user.id,
        target_user_id: request.targetUserId,
        action: 'ban' as AccountAction,
        reason: request.reason,
        previous_status: currentUser?.status || null,
        new_status: 'banned' as UserStatus,
        metadata: request.metadata || {}
      });

      return { data: updatedUser, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Reactivate user account
   */
  async reactivateUser(
    request: AdminActionRequest
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: currentUser } = await this.getUserById(request.targetUserId);

      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          status: 'active' as UserStatus,
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
          banned_at: null,
          banned_by: null,
          ban_reason: null
        })
        .eq('id', request.targetUserId)
        .select()
        .single();

      if (updateError) throw updateError;

      await this.logAdminAction({
        admin_id: user.id,
        target_user_id: request.targetUserId,
        action: 'reactivate' as AccountAction,
        reason: request.reason,
        previous_status: currentUser?.status || null,
        new_status: 'active' as UserStatus,
        metadata: request.metadata || {}
      });

      return { data: updatedUser, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Change user role
   */
  async changeUserRole(
    userId: string,
    newRole: UserRole,
    reason: string
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: currentUser } = await this.getUserById(userId);

      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      await this.logAdminAction({
        admin_id: user.id,
        target_user_id: userId,
        action: 'role_change' as AccountAction,
        reason,
        previous_role: currentUser?.role || null,
        new_role: newRole,
        metadata: {}
      });

      return { data: updatedUser, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Get admin action logs for a user
   */
  async getUserActionLogs(
    userId: string,
    limit: number = 50
  ): Promise<ServiceResponse<AdminActionLog[]>> {
    try {
      const { data, error } = await supabase
        .from('admin_action_logs')
        .select(`
          *,
          admin:user_profiles!admin_id(id, full_name, email),
          target_user:user_profiles!target_user_id(id, full_name, email)
        `)
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('status, role');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        active: data?.filter(u => u?.status === 'active')?.length || 0,
        suspended: data?.filter(u => u?.status === 'suspended')?.length || 0,
        banned: data?.filter(u => u?.status === 'banned')?.length || 0,
        pendingVerification: data?.filter(u => u?.status === 'pending_verification')?.length || 0,
        passengers: data?.filter(u => u?.role === 'passenger')?.length || 0,
        drivers: data?.filter(u => u?.role === 'driver')?.length || 0,
        admins: data?.filter(u => ['super_admin', 'operations', 'finance', 'support'].includes(u?.role))?.length || 0
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Private: Log admin action to audit trail
   */
  async logAdminAction(logData: {
    admin_id: string;
    target_user_id: string;
    action: AccountAction;
    reason: string;
    previous_status?: UserStatus | null;
    new_status?: UserStatus | null;
    previous_role?: UserRole | null;
    new_role?: UserRole | null;
    metadata?: Record<string, any>;
  }): Promise<ServiceResponse<AdminActionLog>> {
    try {
      const { data, error } = await supabase
        .from('admin_action_logs')
        .insert({
          admin_id: logData.admin_id,
          target_user_id: logData.target_user_id,
          action: logData.action,
          reason: logData.reason,
          previous_status: logData.previous_status || null,
          new_status: logData.new_status || null,
          previous_role: logData.previous_role || null,
          new_role: logData.new_role || null,
          metadata: logData.metadata || {}
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
};
import { Database } from './database.types';

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type InsertUserProfile = Database['public']['Tables']['user_profiles']['Insert'];
export type UpdateUserProfile = Database['public']['Tables']['user_profiles']['Update'];

export type AdminActionLog = Database['public']['Tables']['admin_action_logs']['Row'];
export type InsertAdminActionLog = Database['public']['Tables']['admin_action_logs']['Insert'];

export type UserRole = 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending_verification';
export type AccountAction = 'suspend' | 'ban' | 'reactivate' | 'update_profile' | 'role_change';

export interface UserWithStats extends UserProfile {
  totalTrips?: number;
  totalRevenue?: number;
  lastActivityDate?: string;
}

export interface UserManagementFilters {
  searchQuery?: string;
  userType?: 'all' | 'passenger' | 'driver' | 'admin';
  status?: 'all' | UserStatus;
  sortBy?: 'created_at' | 'last_login_at' | 'full_name';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminActionRequest {
  targetUserId: string;
  action: AccountAction;
  reason: string;
  newStatus?: UserStatus;
  newRole?: UserRole;
  metadata?: Record<string, any>;
}
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          role: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver';
          status: 'active' | 'suspended' | 'banned' | 'pending_verification';
          last_login_at: string | null;
          is_email_verified: boolean;
          is_phone_verified: boolean;
          created_at: string;
          updated_at: string;
          suspended_at: string | null;
          suspended_by: string | null;
          suspension_reason: string | null;
          banned_at: string | null;
          banned_by: string | null;
          ban_reason: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver';
          status?: 'active' | 'suspended' | 'banned' | 'pending_verification';
          last_login_at?: string | null;
          is_email_verified?: boolean;
          is_phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspension_reason?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          ban_reason?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver';
          status?: 'active' | 'suspended' | 'banned' | 'pending_verification';
          last_login_at?: string | null;
          is_email_verified?: boolean;
          is_phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspension_reason?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          ban_reason?: string | null;
        };
      };
      admin_action_logs: {
        Row: {
          id: string;
          admin_id: string;
          target_user_id: string;
          action: 'suspend' | 'ban' | 'reactivate' | 'update_profile' | 'role_change';
          reason: string | null;
          previous_status: 'active' | 'suspended' | 'banned' | 'pending_verification' | null;
          new_status: 'active' | 'suspended' | 'banned' | 'pending_verification' | null;
          previous_role: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver' | null;
          new_role: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver' | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          target_user_id: string;
          action: 'suspend' | 'ban' | 'reactivate' | 'update_profile' | 'role_change';
          reason?: string | null;
          previous_status?: 'active' | 'suspended' | 'banned' | 'pending_verification' | null;
          new_status?: 'active' | 'suspended' | 'banned' | 'pending_verification' | null;
          previous_role?: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver' | null;
          new_role?: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver' | null;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          target_user_id?: string;
          action?: 'suspend' | 'ban' | 'reactivate' | 'update_profile' | 'role_change';
          reason?: string | null;
          previous_status?: 'active' | 'suspended' | 'banned' | 'pending_verification' | null;
          new_status?: 'active' | 'suspended' | 'banned' | 'pending_verification' | null;
          previous_role?: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver' | null;
          new_role?: 'super_admin' | 'operations' | 'finance' | 'support' | 'passenger' | 'driver' | null;
          metadata?: any;
          created_at?: string;
        };
      };
    };
  };
}
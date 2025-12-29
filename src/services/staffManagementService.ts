/**
 * Staff Management Service
 * Handles all staff-related database operations
 */

import { supabase } from '@/lib/supabase';
import {
  StaffMember,
  StaffMemberWithDetails,
  CreateStaffMemberInput,
  UpdateStaffMemberInput,
  StaffFilters,
} from '@/types/staff.types';

export const staffManagementService = {
  /**
   * Get all staff members with optional filters
   */
  async getAllStaff(filters?: StaffFilters): Promise<StaffMemberWithDetails[]> {
    let query = supabase
      .from('staff_members')
      .select(`
        *,
        user_profile:user_profiles(full_name, email, phone_number, avatar_url),
        role:roles(id, name, display_name, level),
        manager:staff_members!staff_members_manager_id_fkey(
          user_profile:user_profiles(full_name),
          employee_id
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.role_id) {
      query = query.eq('role_id', filters.role_id);
    }
    if (filters?.employment_status) {
      query = query.eq('employment_status', filters.employment_status);
    }
    if (filters?.search) {
      query = query.or(`employee_id.ilike.%${filters.search}%,department.ilike.%${filters.search}%,job_title.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch staff members: ${error.message}`);
    }

    return data?.map(staff => ({
      ...staff,
      user_profile: staff.user_profile ? {
        full_name: staff.user_profile.full_name,
        email: staff.user_profile.email,
        phone_number: staff.user_profile.phone_number,
        avatar_url: staff.user_profile.avatar_url,
      } : undefined,
      manager: staff.manager ? {
        full_name: staff.manager.user_profile?.full_name || 'Unknown',
        employee_id: staff.manager.employee_id,
      } : undefined,
    })) || [];
  },

  /**
   * Get staff member by ID
   */
  async getStaffById(id: string): Promise<StaffMemberWithDetails | null> {
    const { data, error } = await supabase
      .from('staff_members')
      .select(`
        *,
        user_profile:user_profiles(full_name, email, phone_number, avatar_url),
        role:roles(id, name, display_name, level, description),
        manager:staff_members!staff_members_manager_id_fkey(
          user_profile:user_profiles(full_name),
          employee_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch staff member: ${error.message}`);
    }

    if (!data) return null;

    return {
      ...data,
      user_profile: data.user_profile ? {
        full_name: data.user_profile.full_name,
        email: data.user_profile.email,
        phone_number: data.user_profile.phone_number,
        avatar_url: data.user_profile.avatar_url,
      } : undefined,
      manager: data.manager ? {
        full_name: data.manager.user_profile?.full_name || 'Unknown',
        employee_id: data.manager.employee_id,
      } : undefined,
    };
  },

  /**
   * Get staff member by user profile ID
   */
  async getStaffByUserId(userId: string): Promise<StaffMemberWithDetails | null> {
    const { data, error } = await supabase
      .from('staff_members')
      .select(`
        *,
        user_profile:user_profiles(full_name, email, phone_number, avatar_url),
        role:roles(id, name, display_name, level, description)
      `)
      .eq('user_profile_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch staff member: ${error.message}`);
    }

    if (!data) return null;

    return {
      ...data,
      user_profile: data.user_profile ? {
        full_name: data.user_profile.full_name,
        email: data.user_profile.email,
        phone_number: data.user_profile.phone_number,
        avatar_url: data.user_profile.avatar_url,
      } : undefined,
    };
  },

  /**
   * Create new staff member
   */
  async createStaff(input: CreateStaffMemberInput): Promise<StaffMember> {
    const { data, error } = await supabase
      .from('staff_members')
      .insert(input)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create staff member: ${error.message}`);
    }

    return data;
  },

  /**
   * Update staff member
   */
  async updateStaff(id: string, input: UpdateStaffMemberInput): Promise<StaffMember> {
    const { data, error } = await supabase
      .from('staff_members')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update staff member: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete staff member
   */
  async deleteStaff(id: string): Promise<void> {
    const { error } = await supabase
      .from('staff_members')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete staff member: ${error.message}`);
    }
  },

  /**
   * Get unique departments
   */
  async getDepartments(): Promise<string[]> {
    const { data, error } = await supabase
      .from('staff_members')
      .select('department')
      .order('department');

    if (error) {
      throw new Error(`Failed to fetch departments: ${error.message}`);
    }

    const departments = [...new Set(data?.map(d => d.department) || [])];
    return departments;
  },

  /**
   * Get staff statistics
   */
  async getStaffStats() {
    const { data, error } = await supabase
      .from('staff_members')
      .select('employment_status, department');

    if (error) {
      throw new Error(`Failed to fetch staff stats: ${error.message}`);
    }

    const total = data?.length || 0;
    const active = data?.filter(s => s.employment_status === 'active').length || 0;
    const departments = [...new Set(data?.map(s => s.department) || [])].length;

    return { total, active, departments };
  },

  /**
   * Update performance score
   */
  async updatePerformance(
    id: string,
    performanceScore: number,
    reviewDate: string
  ): Promise<StaffMember> {
    const { data, error } = await supabase
      .from('staff_members')
      .update({
        performance_score: performanceScore,
        last_performance_review: reviewDate,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update performance: ${error.message}`);
    }

    return data;
  },
};
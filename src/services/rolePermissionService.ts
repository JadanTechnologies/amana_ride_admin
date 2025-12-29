/**
 * Role & Permission Management Service
 * Handles role and permission operations
 */

import { supabase } from '@/lib/supabase';
import {
  Role,
  Permission,
  RoleWithPermissions,
  CreateRoleInput,
  UpdateRoleInput,
  AssignPermissionsInput,
  PermissionFilters,
} from '@/types/staff.types';

export const rolePermissionService = {
  /**
   * Get all roles with optional permission details
   */
  async getAllRoles(includePermissions = false): Promise<RoleWithPermissions[]> {
    let query = supabase
      .from('roles')
      .select(
        includePermissions
          ? `*, role_permissions(permission:permissions(*))`
          : '*'
      )
      .order('level', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }

    if (!includePermissions) return data || [];

    return data?.map(role => ({
      ...role,
      permissions: role.role_permissions?.map((rp: any) => rp.permission) || [],
    })) || [];
  },

  /**
   * Get role by ID with permissions
   */
  async getRoleById(id: string): Promise<RoleWithPermissions | null> {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions(permission:permissions(*))
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return {
      ...data,
      permissions: data.role_permissions?.map((rp: any) => rp.permission) || [],
    };
  },

  /**
   * Create new role
   */
  async createRole(input: CreateRoleInput): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .insert(input)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }

    return data;
  },

  /**
   * Update role
   */
  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update role: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete role
   */
  async deleteRole(id: string): Promise<void> {
    // Check if role is system role
    const { data: role } = await supabase
      .from('roles')
      .select('is_system_role')
      .eq('id', id)
      .single();

    if (role?.is_system_role) {
      throw new Error('Cannot delete system roles');
    }

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  },

  /**
   * Get all permissions with optional filters
   */
  async getAllPermissions(filters?: PermissionFilters): Promise<Permission[]> {
    let query = supabase
      .from('permissions')
      .select('*')
      .order('module', { ascending: true })
      .order('action', { ascending: true });

    if (filters?.module) {
      query = query.eq('module', filters.module);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Assign permissions to role
   */
  async assignPermissions(input: AssignPermissionsInput): Promise<void> {
    // First, remove existing permissions
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', input.role_id);

    if (deleteError) {
      throw new Error(`Failed to clear existing permissions: ${deleteError.message}`);
    }

    // Then, add new permissions
    if (input.permission_ids.length > 0) {
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(
          input.permission_ids.map(permissionId => ({
            role_id: input.role_id,
            permission_id: permissionId,
          }))
        );

      if (insertError) {
        throw new Error(`Failed to assign permissions: ${insertError.message}`);
      }
    }
  },

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission:permissions(*)')
      .eq('role_id', roleId);

    if (error) {
      throw new Error(`Failed to fetch role permissions: ${error.message}`);
    }

    return data?.map((rp: any) => rp.permission) || [];
  },

  /**
   * Check if user has specific permission
   */
  async checkUserPermission(
    userId: string,
    module: string,
    action: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('user_has_permission', {
      user_id: userId,
      required_module: module,
      required_action: action,
    });

    if (error) {
      console.log('Permission check error:', error);
      return false;
    }

    return data || false;
  },

  /**
   * Get all user permissions
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      user_id: userId,
    });

    if (error) {
      throw new Error(`Failed to fetch user permissions: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get permission modules (unique list)
   */
  async getPermissionModules(): Promise<string[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('module');

    if (error) {
      throw new Error(`Failed to fetch modules: ${error.message}`);
    }

    const modules = [...new Set(data?.map(p => p.module) || [])];
    return modules;
  },
};
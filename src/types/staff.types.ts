/**
 * Staff Management & RBAC Type Definitions
 * Generated: 2025-12-22 10:17:18
 */

export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'probation' | 'terminated';

export type PermissionModule = 
  | 'user_management' |'staff_management' |'financial_operations' |'system_configuration' |'analytics_access' |'api_controls' |'live_operations' |'content_management';

export type PermissionAction = 
  | 'create' |'read' |'update' |'delete' |'export' |'import' |'approve' |'reject';

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  level: number;
  is_system_role: boolean;
  parent_role_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Permission {
  id: string;
  module: PermissionModule;
  action: PermissionAction;
  resource: string | null;
  description: string | null;
  is_system_permission: boolean;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by: string | null;
}

export interface StaffMember {
  id: string;
  user_profile_id: string;
  role_id: string;
  employee_id: string;
  department: string;
  job_title: string;
  employment_status: EmploymentStatus;
  hire_date: string;
  termination_date: string | null;
  manager_id: string | null;
  performance_score: number | null;
  last_performance_review: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface StaffMemberWithDetails extends StaffMember {
  user_profile?: {
    full_name: string;
    email: string;
    phone_number: string | null;
    avatar_url: string | null;
  };
  role?: Role;
  manager?: {
    full_name: string;
    employee_id: string;
  };
}

export interface RoleWithPermissions extends Role {
  permissions?: Permission[];
}

// Form types
export interface CreateStaffMemberInput {
  user_profile_id: string;
  role_id: string;
  employee_id: string;
  department: string;
  job_title: string;
  employment_status: EmploymentStatus;
  hire_date: string;
  manager_id?: string;
  notes?: string;
}

export interface UpdateStaffMemberInput {
  role_id?: string;
  department?: string;
  job_title?: string;
  employment_status?: EmploymentStatus;
  manager_id?: string;
  performance_score?: number;
  last_performance_review?: string;
  notes?: string;
}

export interface CreateRoleInput {
  name: string;
  display_name: string;
  description?: string;
  level: number;
  parent_role_id?: string;
}

export interface UpdateRoleInput {
  display_name?: string;
  description?: string;
  level?: number;
  parent_role_id?: string;
}

export interface AssignPermissionsInput {
  role_id: string;
  permission_ids: string[];
}

// Filter types
export interface StaffFilters {
  department?: string;
  role_id?: string;
  employment_status?: EmploymentStatus;
  search?: string;
}

export interface PermissionFilters {
  module?: PermissionModule;
  action?: PermissionAction;
}
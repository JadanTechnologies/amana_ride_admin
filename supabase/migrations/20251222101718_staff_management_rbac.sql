-- =====================================================
-- Staff Management & RBAC Migration
-- Generated: 2025-12-22 10:17:18
-- Module: Staff Management & Role-Based Access Control
-- DEPENDENCIES: Requires user_profiles table from 20251222100249_user_management_with_auth.sql
-- =====================================================

-- IMPORTANT: This migration depends on the user_profiles table created in 
-- the earlier migration (20251222100249_user_management_with_auth.sql)
-- Ensure that migration is applied first before running this migration.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS & TYPES
-- =====================================================

-- Employment status for staff members
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
    CREATE TYPE employment_status AS ENUM (
      'active',
      'inactive',
      'on_leave',
      'probation',
      'terminated'
    );
  END IF;
END $$;

-- Permission modules for access control
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_module') THEN
    CREATE TYPE permission_module AS ENUM (
      'user_management',
      'staff_management',
      'financial_operations',
      'system_configuration',
      'analytics_access',
      'api_controls',
      'live_operations',
      'content_management'
    );
  END IF;
END $$;

-- Permission actions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_action') THEN
    CREATE TYPE permission_action AS ENUM (
      'create',
      'read',
      'update',
      'delete',
      'export',
      'import',
      'approve',
      'reject'
    );
  END IF;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

-- Roles table with hierarchical structure
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0, -- Hierarchy level (0=highest, e.g., Super Admin)
  is_system_role BOOLEAN DEFAULT false, -- System roles cannot be deleted
  parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT level_non_negative CHECK (level >= 0)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module permission_module NOT NULL,
  action permission_action NOT NULL,
  resource VARCHAR(100), -- Specific resource within module (e.g., 'reports', 'settings')
  description TEXT,
  is_system_permission BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_permission UNIQUE (module, action, resource)
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID,
  
  CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

-- Staff members table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_profile_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  department VARCHAR(100) NOT NULL,
  job_title VARCHAR(150) NOT NULL,
  employment_status employment_status DEFAULT 'active',
  hire_date DATE NOT NULL,
  termination_date DATE,
  manager_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  performance_score DECIMAL(3,2), -- Scale 0.00 to 5.00
  last_performance_review DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_performance_score CHECK (performance_score >= 0 AND performance_score <= 5),
  CONSTRAINT termination_date_valid CHECK (termination_date IS NULL OR termination_date >= hire_date)
);

-- Add foreign key constraints AFTER table creation to handle circular dependencies
DO $$
BEGIN
  -- Add foreign key to roles table if user_profiles exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'roles_created_by_fkey' 
      AND table_name = 'roles'
    ) THEN
      ALTER TABLE roles ADD CONSTRAINT roles_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key to role_permissions table
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'role_permissions_granted_by_fkey' 
      AND table_name = 'role_permissions'
    ) THEN
      ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_granted_by_fkey 
        FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key to staff_members table
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'staff_members_user_profile_id_fkey' 
      AND table_name = 'staff_members'
    ) THEN
      ALTER TABLE staff_members ADD CONSTRAINT staff_members_user_profile_id_fkey 
        FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Audit logs table (if not exists from user management migration)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for audit_logs if user_profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'audit_logs_user_id_fkey' 
      AND table_name = 'audit_logs'
    ) THEN
      ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- INDEXES
-- =====================================================

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- Role-Permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Staff members indexes
CREATE INDEX IF NOT EXISTS idx_staff_user_profile ON staff_members(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff_members(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff_members(department);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff_members(employment_status);
CREATE INDEX IF NOT EXISTS idx_staff_manager ON staff_members(manager_id);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff_members(employee_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can view roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON roles;
DROP POLICY IF EXISTS "Public can view permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;
DROP POLICY IF EXISTS "Public can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Staff can view all staff members" ON staff_members;
DROP POLICY IF EXISTS "Admins can manage staff members" ON staff_members;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

-- Roles policies
CREATE POLICY "Public can view roles"
  ON roles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage roles"
  ON roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE sm.user_profile_id = auth.uid()
      AND p.module = 'staff_management'
      AND p.action IN ('create', 'update', 'delete')
    )
  );

-- Permissions policies
CREATE POLICY "Public can view permissions"
  ON permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE sm.user_profile_id = auth.uid()
      AND p.module = 'system_configuration'
      AND p.action IN ('create', 'update', 'delete')
    )
  );

-- Role-permissions policies
CREATE POLICY "Public can view role permissions"
  ON role_permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE sm.user_profile_id = auth.uid()
      AND p.module = 'staff_management'
      AND p.action IN ('create', 'update', 'delete')
    )
  );

-- Staff members policies
CREATE POLICY "Staff can view all staff members"
  ON staff_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE user_profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage staff members"
  ON staff_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE sm.user_profile_id = auth.uid()
      AND p.module = 'staff_management'
      AND p.action IN ('create', 'update', 'delete')
    )
  );

-- Audit logs policies
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE sm.user_profile_id = auth.uid()
      AND p.module = 'system_configuration'
      AND p.action = 'read'
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp (reuse if exists from user management)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_members_updated_at ON staff_members;
CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check role hierarchy (prevent circular references)
CREATE OR REPLACE FUNCTION check_role_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_role_id IS NOT NULL THEN
    -- Check for self-reference
    IF NEW.id = NEW.parent_role_id THEN
      RAISE EXCEPTION 'Role cannot be its own parent';
    END IF;
    
    -- Check for circular reference (simplified check)
    IF EXISTS (
      SELECT 1 FROM roles
      WHERE id = NEW.parent_role_id
      AND parent_role_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular role hierarchy detected';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_role_hierarchy_trigger ON roles;
CREATE TRIGGER check_role_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION check_role_hierarchy();

-- Function to audit staff changes
CREATE OR REPLACE FUNCTION audit_staff_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, changes, user_id)
    VALUES ('staff_members', NEW.id, 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, changes, user_id)
    VALUES ('staff_members', NEW.id, 'UPDATE', 
      jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb),
      auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, changes, user_id)
    VALUES ('staff_members', OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_staff_changes_trigger ON staff_members;
CREATE TRIGGER audit_staff_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON staff_members
  FOR EACH ROW
  EXECUTE FUNCTION audit_staff_changes();

-- =====================================================
-- SEED DATA - System Roles
-- =====================================================

-- Insert system roles (only if not exists)
INSERT INTO roles (name, display_name, description, level, is_system_role) 
SELECT * FROM (VALUES
  ('super_admin', 'Super Administrator', 'Full system access with all permissions', 0, true),
  ('admin', 'Administrator', 'Administrative access with limited system configuration', 1, true),
  ('manager', 'Manager', 'Department management and team oversight', 2, true),
  ('analyst', 'Analyst', 'Analytics and reporting access', 3, true),
  ('support', 'Support Staff', 'Customer support and basic operations', 4, true)
) AS v(name, display_name, description, level, is_system_role)
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE roles.name = v.name
);

-- =====================================================
-- SEED DATA - System Permissions
-- =====================================================

-- User Management Permissions
INSERT INTO permissions (module, action, description, is_system_permission) 
SELECT 
  v.module::permission_module,
  v.action::permission_action,
  v.description,
  v.is_system_permission
FROM (VALUES
  ('user_management', 'create', 'Create new users', true),
  ('user_management', 'read', 'View user information', true),
  ('user_management', 'update', 'Update user details', true),
  ('user_management', 'delete', 'Delete users', true),
  ('user_management', 'export', 'Export user data', true)
) AS v(module, action, description, is_system_permission)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions 
  WHERE permissions.module = v.module::permission_module 
  AND permissions.action = v.action::permission_action
);

-- Staff Management Permissions
INSERT INTO permissions (module, action, description, is_system_permission) 
SELECT 
  v.module::permission_module,
  v.action::permission_action,
  v.description,
  v.is_system_permission
FROM (VALUES
  ('staff_management', 'create', 'Create new staff members', true),
  ('staff_management', 'read', 'View staff information', true),
  ('staff_management', 'update', 'Update staff details', true),
  ('staff_management', 'delete', 'Remove staff members', true),
  ('staff_management', 'export', 'Export staff data', true)
) AS v(module, action, description, is_system_permission)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions 
  WHERE permissions.module = v.module::permission_module 
  AND permissions.action = v.action::permission_action
);

-- Financial Operations Permissions
INSERT INTO permissions (module, action, description, is_system_permission) 
SELECT 
  v.module::permission_module,
  v.action::permission_action,
  v.description,
  v.is_system_permission
FROM (VALUES
  ('financial_operations', 'read', 'View financial data', true),
  ('financial_operations', 'export', 'Export financial reports', true),
  ('financial_operations', 'approve', 'Approve financial transactions', true)
) AS v(module, action, description, is_system_permission)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions 
  WHERE permissions.module = v.module::permission_module 
  AND permissions.action = v.action::permission_action
);

-- System Configuration Permissions
INSERT INTO permissions (module, action, description, is_system_permission) 
SELECT 
  v.module::permission_module,
  v.action::permission_action,
  v.description,
  v.is_system_permission
FROM (VALUES
  ('system_configuration', 'create', 'Create system configurations', true),
  ('system_configuration', 'read', 'View system settings', true),
  ('system_configuration', 'update', 'Update system configurations', true),
  ('system_configuration', 'delete', 'Delete configurations', true)
) AS v(module, action, description, is_system_permission)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions 
  WHERE permissions.module = v.module::permission_module 
  AND permissions.action = v.action::permission_action
);

-- Analytics Access Permissions
INSERT INTO permissions (module, action, description, is_system_permission) 
SELECT 
  v.module::permission_module,
  v.action::permission_action,
  v.description,
  v.is_system_permission
FROM (VALUES
  ('analytics_access', 'read', 'View analytics dashboards', true),
  ('analytics_access', 'export', 'Export analytics reports', true)
) AS v(module, action, description, is_system_permission)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions 
  WHERE permissions.module = v.module::permission_module 
  AND permissions.action = v.action::permission_action
);

-- API Controls Permissions
INSERT INTO permissions (module, action, description, is_system_permission) 
SELECT 
  v.module::permission_module,
  v.action::permission_action,
  v.description,
  v.is_system_permission
FROM (VALUES
  ('api_controls', 'create', 'Create API keys', true),
  ('api_controls', 'read', 'View API configurations', true),
  ('api_controls', 'update', 'Update API settings', true),
  ('api_controls', 'delete', 'Delete API keys', true)
) AS v(module, action, description, is_system_permission)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions 
  WHERE permissions.module = v.module::permission_module 
  AND permissions.action = v.action::permission_action
);

-- Live Operations Permissions
INSERT INTO permissions (module, action, description, is_system_permission) 
SELECT 
  v.module::permission_module,
  v.action::permission_action,
  v.description,
  v.is_system_permission
FROM (VALUES
  ('live_operations', 'read', 'Monitor live operations', true),
  ('live_operations', 'update', 'Manage live operations', true)
) AS v(module, action, description, is_system_permission)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions 
  WHERE permissions.module = v.module::permission_module 
  AND permissions.action = v.action::permission_action
);

-- =====================================================
-- SEED DATA - Role-Permission Mappings
-- =====================================================

-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2
  WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
);

-- Admin gets most permissions except system-critical ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.module != 'api_controls'::permission_module
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2
  WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
);

-- Manager gets read/update permissions for user and staff management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
AND (
  (p.module = 'user_management'::permission_module AND p.action IN ('read'::permission_action, 'update'::permission_action))
  OR (p.module = 'staff_management'::permission_module AND p.action IN ('read'::permission_action, 'update'::permission_action))
  OR (p.module = 'analytics_access'::permission_module AND p.action = 'read'::permission_action)
  OR (p.module = 'live_operations'::permission_module AND p.action = 'read'::permission_action)
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2
  WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
);

-- Analyst gets read and export permissions for analytics
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'analyst'
AND (
  (p.module = 'analytics_access'::permission_module)
  OR (p.module = 'financial_operations'::permission_module AND p.action IN ('read'::permission_action, 'export'::permission_action))
  OR (p.module = 'user_management'::permission_module AND p.action = 'read'::permission_action)
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2
  WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
);

-- Support gets basic read permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'support'
AND p.action = 'read'::permission_action
AND p.module IN ('user_management'::permission_module, 'live_operations'::permission_module)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2
  WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_id UUID,
  required_module permission_module,
  required_action permission_action
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff_members sm
    JOIN role_permissions rp ON sm.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE sm.user_profile_id = user_id
    AND p.module = required_module
    AND p.action = required_action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's all permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TABLE (
  module permission_module,
  action permission_action,
  resource VARCHAR,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.module, p.action, p.resource, p.description
  FROM staff_members sm
  JOIN role_permissions rp ON sm.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE sm.user_profile_id = user_id
  AND sm.employment_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE roles IS 'Hierarchical roles for staff members with inheritance support';
COMMENT ON TABLE permissions IS 'Granular permissions for access control across modules';
COMMENT ON TABLE role_permissions IS 'Many-to-many mapping between roles and permissions';
COMMENT ON TABLE staff_members IS 'Staff member profiles with role assignments and performance tracking';
COMMENT ON TABLE audit_logs IS 'Audit trail for all staff and role-related changes';

COMMENT ON FUNCTION user_has_permission IS 'Check if a user has a specific permission';
COMMENT ON FUNCTION get_user_permissions IS 'Retrieve all permissions for a user';
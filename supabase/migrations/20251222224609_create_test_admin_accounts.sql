-- Migration: Create Test Admin Staff Records for Development
-- This migration creates staff member records that can be linked to auth accounts
-- Timestamp: 2025-12-22 22:46:09

-- ============================================================================
-- SECTION 1: Ensure Required Roles Exist
-- ============================================================================

DO $$
DECLARE
  super_admin_role_id UUID;
  operations_role_id UUID;
  finance_role_id UUID;
  support_role_id UUID;
BEGIN
  -- Get or create Super Admin role
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  IF super_admin_role_id IS NULL THEN
    INSERT INTO roles (name, display_name, description, level, is_system_role, created_at)
    VALUES ('super_admin', 'Super Admin', 'Full system access with all permissions', 100, true, NOW())
    RETURNING id INTO super_admin_role_id;
  END IF;

  -- Get or create Operations role
  SELECT id INTO operations_role_id FROM roles WHERE name = 'operations_manager';
  IF operations_role_id IS NULL THEN
    INSERT INTO roles (name, display_name, description, level, is_system_role, created_at)
    VALUES ('operations_manager', 'Operations Manager', 'Operations management and monitoring', 80, true, NOW())
    RETURNING id INTO operations_role_id;
  END IF;

  -- Get or create Finance role
  SELECT id INTO finance_role_id FROM roles WHERE name = 'finance_manager';
  IF finance_role_id IS NULL THEN
    INSERT INTO roles (name, display_name, description, level, is_system_role, created_at)
    VALUES ('finance_manager', 'Finance Manager', 'Financial analytics and reporting', 70, true, NOW())
    RETURNING id INTO finance_role_id;
  END IF;

  -- Get or create Support role
  SELECT id INTO support_role_id FROM roles WHERE name = 'support_manager';
  IF support_role_id IS NULL THEN
    INSERT INTO roles (name, display_name, description, level, is_system_role, created_at)
    VALUES ('support_manager', 'Support Manager', 'Customer support and assistance', 60, true, NOW())
    RETURNING id INTO support_role_id;
  END IF;

END $$;

-- ============================================================================
-- SECTION 2: Create Test Staff Member Records
-- ============================================================================

-- Note: user_profile_id will be linked when actual auth users are created
-- These records allow the quick-login UI to reference the credentials

DO $$
DECLARE
  super_admin_role_id UUID;
  operations_role_id UUID;
  finance_role_id UUID;
  support_role_id UUID;
BEGIN
  -- Fetch role IDs
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO operations_role_id FROM roles WHERE name = 'operations_manager';
  SELECT id INTO finance_role_id FROM roles WHERE name = 'finance_manager';
  SELECT id INTO support_role_id FROM roles WHERE name = 'support_manager';

  -- Super Admin Staff Record
  -- NOTE: performance_score must be between 0.00 and 5.00 per CHECK constraint
  INSERT INTO staff_members (
    user_profile_id,
    employee_id,
    job_title,
    department,
    employment_status,
    role_id,
    hire_date,
    performance_score,
    created_at
  ) VALUES (
    gen_random_uuid(), -- Placeholder UUID, will be updated when auth user is created
    'EMP-SA-001',
    'Super Administrator',
    'Administration',
    'active',
    super_admin_role_id,
    NOW(),
    5.00, -- Maximum performance score within 0.00-5.00 constraint
    NOW()
  ) ON CONFLICT (employee_id) DO UPDATE 
  SET 
    employment_status = 'active',
    role_id = super_admin_role_id,
    performance_score = 5.00,
    updated_at = NOW();

  -- Operations Manager Staff Record
  INSERT INTO staff_members (
    user_profile_id,
    employee_id,
    job_title,
    department,
    employment_status,
    role_id,
    hire_date,
    performance_score,
    created_at
  ) VALUES (
    gen_random_uuid(),
    'EMP-OPS-001',
    'Operations Manager',
    'Operations',
    'active',
    operations_role_id,
    NOW(),
    4.75, -- High performance score within valid range
    NOW()
  ) ON CONFLICT (employee_id) DO UPDATE 
  SET 
    employment_status = 'active',
    role_id = operations_role_id,
    performance_score = 4.75,
    updated_at = NOW();

  -- Finance Manager Staff Record
  INSERT INTO staff_members (
    user_profile_id,
    employee_id,
    job_title,
    department,
    employment_status,
    role_id,
    hire_date,
    performance_score,
    created_at
  ) VALUES (
    gen_random_uuid(),
    'EMP-FIN-001',
    'Finance Manager',
    'Finance',
    'active',
    finance_role_id,
    NOW(),
    4.60, -- Good performance score within valid range
    NOW()
  ) ON CONFLICT (employee_id) DO UPDATE 
  SET 
    employment_status = 'active',
    role_id = finance_role_id,
    performance_score = 4.60,
    updated_at = NOW();

  -- Support Manager Staff Record
  INSERT INTO staff_members (
    user_profile_id,
    employee_id,
    job_title,
    department,
    employment_status,
    role_id,
    hire_date,
    performance_score,
    created_at
  ) VALUES (
    gen_random_uuid(),
    'EMP-SUP-001',
    'Support Manager',
    'Customer Support',
    'active',
    support_role_id,
    NOW(),
    4.50, -- Solid performance score within valid range
    NOW()
  ) ON CONFLICT (employee_id) DO UPDATE 
  SET 
    employment_status = 'active',
    role_id = support_role_id,
    performance_score = 4.50,
    updated_at = NOW();

END $$;

-- ============================================================================
-- SECTION 3: Grant Permissions to Test Admin Roles
-- ============================================================================

-- Grant comprehensive permissions to Super Admin
DO $$
DECLARE
  super_admin_role_id UUID;
  perm_id UUID;
BEGIN
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  
  IF super_admin_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions 
      WHERE module IN ('user_management', 'staff_management', 'financial_operations', 
                      'system_configuration', 'analytics_access', 'api_controls', 
                      'live_operations', 'content_management')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id, granted_at)
      VALUES (super_admin_role_id, perm_id, NOW())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Grant operations permissions
DO $$
DECLARE
  operations_role_id UUID;
  perm_id UUID;
BEGIN
  SELECT id INTO operations_role_id FROM roles WHERE name = 'operations_manager';
  
  IF operations_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions 
      WHERE module IN ('live_operations', 'user_management', 'analytics_access')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id, granted_at)
      VALUES (operations_role_id, perm_id, NOW())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Grant finance permissions
DO $$
DECLARE
  finance_role_id UUID;
  perm_id UUID;
BEGIN
  SELECT id INTO finance_role_id FROM roles WHERE name = 'finance_manager';
  
  IF finance_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions 
      WHERE module IN ('financial_operations', 'analytics_access')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id, granted_at)
      VALUES (finance_role_id, perm_id, NOW())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Grant support permissions
DO $$
DECLARE
  support_role_id UUID;
  perm_id UUID;
BEGIN
  SELECT id INTO support_role_id FROM roles WHERE name = 'support_manager';
  
  IF support_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions 
      WHERE module IN ('user_management', 'content_management')
      AND action IN ('read', 'update')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id, granted_at)
      VALUES (support_role_id, perm_id, NOW())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- IMPORTANT NOTES FOR AUTHENTICATION SETUP
-- ============================================================================

-- This migration creates the staff member records and roles needed for test accounts.
-- To actually create the authentication accounts, you need to:
-- 
-- 1. Use Supabase Dashboard: Go to Authentication > Users > Add User
--    OR
-- 2. Use Supabase Auth API to programmatically create users:
--
--    Test Account Credentials to Create:
--    - admin@amanaride.com (password: SuperAdmin2024!) - Link to EMP-SA-001
--    - operations@amanaride.com (password: Operations2024!) - Link to EMP-OPS-001
--    - finance@amanaride.com (password: Finance2024!) - Link to EMP-FIN-001
--    - support@amanaride.com (password: Support2024!) - Link to EMP-SUP-001
--
-- 3. After creating each auth user, update the staff_members.user_profile_id
--    to link the auth.users.id with the corresponding staff member record.
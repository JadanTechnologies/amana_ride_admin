-- =====================================================================================
-- Migration: Create Admin Authentication Account (AUTOMATED) - FIXED
-- =====================================================================================
-- Description: Automatically creates admin@amanaride.com account with proper linkage
-- Author: Rocket
-- Created: 2025-12-29
-- Updated: 2025-12-29 - Fixed provider_id constraint violation
-- =====================================================================================

-- =====================================================================================
-- AUTOMATED SETUP: Create Auth User and Link to Staff Member
-- =====================================================================================
-- This migration automatically:
-- 1. Creates admin@amanaride.com in auth.users (if not exists)
-- 2. Creates proper identity record with provider_id
-- 3. Links auth user to staff_members table with Super Admin role
-- 4. Ensures account is active and ready for login

DO $$
DECLARE
    v_auth_user_id UUID;
    v_identity_id UUID;
    v_super_admin_role_id UUID;
    v_existing_staff_id UUID;
    v_admin_email TEXT := 'admin@amanaride.com';
BEGIN
    -- =====================================================================================
    -- STEP 1: Find or Create Auth User
    -- =====================================================================================
    
    -- Check if auth user already exists
    SELECT id INTO v_auth_user_id
    FROM auth.users
    WHERE email = v_admin_email;

    IF v_auth_user_id IS NULL THEN
        -- Generate UUID for identity record first
        v_identity_id := gen_random_uuid();
        
        -- Create new auth user with confirmed email
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            v_admin_email,
            crypt('Amana@2026', gen_salt('bf')), -- Password: Amana@2026
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            NOW(),
            NOW(),
            '',
            '',
            ''
        )
        RETURNING id INTO v_auth_user_id;
        
        -- Create identity record for email provider with required provider_id
        INSERT INTO auth.identities (
            id,
            user_id,
            provider_id,
            provider,
            identity_data,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_identity_id,
            v_auth_user_id,
            v_auth_user_id::text,  -- FIXED: provider_id is required and must be a string
            'email',
            jsonb_build_object(
                'sub', v_auth_user_id::text,
                'email', v_admin_email,
                'email_verified', true,
                'phone_verified', false,
                'provider', 'email'
            ),
            NOW(),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✓ Created new auth user: admin@amanaride.com (ID: %)', v_auth_user_id;
        RAISE NOTICE '✓ Created identity record (ID: %, provider_id: %)', v_identity_id, v_auth_user_id::text;
    ELSE
        RAISE NOTICE '✓ Auth user already exists: admin@amanaride.com (ID: %)', v_auth_user_id;
        
        -- Verify identity record exists
        SELECT id INTO v_identity_id
        FROM auth.identities
        WHERE user_id = v_auth_user_id AND provider = 'email';
        
        IF v_identity_id IS NULL THEN
            -- Create missing identity record
            INSERT INTO auth.identities (
                id,
                user_id,
                provider_id,
                provider,
                identity_data,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_auth_user_id,
                v_auth_user_id::text,
                'email',
                jsonb_build_object(
                    'sub', v_auth_user_id::text,
                    'email', v_admin_email,
                    'email_verified', true,
                    'phone_verified', false,
                    'provider', 'email'
                ),
                NOW(),
                NOW(),
                NOW()
            );
            RAISE NOTICE '✓ Created missing identity record for existing user';
        ELSE
            RAISE NOTICE '✓ Identity record already exists (ID: %)', v_identity_id;
        END IF;
    END IF;

    -- =====================================================================================
    -- STEP 2: Get Super Admin Role
    -- =====================================================================================
    
    SELECT id INTO v_super_admin_role_id
    FROM public.roles
    WHERE name = 'super_admin'
    LIMIT 1;

    IF v_super_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Super Admin role not found. Please ensure staff_management_rbac migration has been applied first.';
    END IF;

    -- =====================================================================================
    -- STEP 3: Link Auth User to Staff Member
    -- =====================================================================================
    
    -- Check if staff member already exists
    SELECT id INTO v_existing_staff_id
    FROM public.staff_members
    WHERE employee_id = 'ADMIN-001';

    IF v_existing_staff_id IS NOT NULL THEN
        -- Update existing staff member with auth user ID
        UPDATE public.staff_members
        SET 
            user_profile_id = v_auth_user_id,
            employment_status = 'active',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_existing_staff_id;
        
        RAISE NOTICE '✓ Linked auth user to existing staff member ADMIN-001';
    ELSE
        -- Create new staff member
        INSERT INTO public.staff_members (
            id,
            user_profile_id,
            employee_id,
            role_id,
            job_title,
            department,
            employment_status,
            hire_date,
            performance_score,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_auth_user_id,
            'ADMIN-001',
            v_super_admin_role_id,
            'System Administrator',
            'Technology',
            'active',
            CURRENT_DATE,
            5.00,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE '✓ Created new staff member ADMIN-001 with auth user link';
    END IF;

    -- =====================================================================================
    -- STEP 4: Verify Setup
    -- =====================================================================================
    
    -- Output verification details
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADMIN ACCOUNT SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Email: admin@amanaride.com';
    RAISE NOTICE 'Password: Amana@2026';
    RAISE NOTICE 'Auth User ID: %', v_auth_user_id;
    RAISE NOTICE 'Employee ID: ADMIN-001';
    RAISE NOTICE 'Role: Super Admin';
    RAISE NOTICE 'Status: Active';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'You can now login at /admin-login';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error setting up admin account: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;

-- =====================================================================================
-- VERIFICATION QUERY (Optional - Run to verify setup)
-- =====================================================================================

SELECT 
    sm.employee_id,
    sm.user_profile_id,
    r.name as role_name,
    r.display_name as role_display_name,
    sm.employment_status,
    sm.job_title,
    au.email,
    au.email_confirmed_at,
    ai.provider_id,
    ai.provider,
    CASE 
        WHEN au.id IS NULL THEN '❌ Auth user not found'
        WHEN au.email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
        WHEN sm.employment_status != 'active' THEN '⚠️ Employment status not active'
        WHEN ai.id IS NULL THEN '❌ Identity record missing'
        WHEN ai.provider_id IS NULL THEN '❌ provider_id is NULL'
        ELSE '✓ Setup complete - Ready for login'
    END as status
FROM public.staff_members sm
JOIN public.roles r ON sm.role_id = r.id
LEFT JOIN auth.users au ON sm.user_profile_id = au.id
LEFT JOIN auth.identities ai ON au.id = ai.user_id AND ai.provider = 'email'
WHERE sm.employee_id = 'ADMIN-001';

-- =====================================================================================
-- TROUBLESHOOTING
-- =====================================================================================
-- 
-- If login still fails after running this migration:
-- 1. Check that staff_management_rbac migration was applied (Super Admin role must exist)
-- 2. Verify the verification query above shows "✓ Setup complete"
-- 3. Ensure provider_id is not NULL in the verification results
-- 4. Clear browser cache and try logging in again
-- 5. Check Supabase logs for any authentication errors
-- 
-- Common Issues Fixed in This Version:
-- - Added required provider_id field to auth.identities insert
-- - provider_id is set to v_auth_user_id::text (user UUID as string)
-- - Enhanced identity_data with proper email verification flags
-- - Added check to create missing identity record for existing users
-- =====================================================================================
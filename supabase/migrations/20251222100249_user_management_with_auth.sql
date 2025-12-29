-- Location: supabase/migrations/20251222100249_user_management_with_auth.sql
-- Module: User Management with Authentication & Admin Controls
-- Schema Analysis: Fresh project - no existing tables
-- Integration Type: NEW_MODULE - Complete schema creation
-- Dependencies: None (fresh start)

-- 1. Types and Enums
CREATE TYPE public.user_role AS ENUM ('super_admin', 'operations', 'finance', 'support', 'passenger', 'driver');
CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'banned', 'pending_verification');
CREATE TYPE public.account_action AS ENUM ('suspend', 'ban', 'reactivate', 'update_profile', 'role_change');

-- 2. Core Tables

-- User profiles table (intermediary between auth.users and app tables)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role public.user_role DEFAULT 'passenger'::public.user_role NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    last_login_at TIMESTAMPTZ,
    is_email_verified BOOLEAN DEFAULT false,
    is_phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    suspension_reason TEXT,
    banned_at TIMESTAMPTZ,
    banned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    ban_reason TEXT
);

-- Admin action audit log
CREATE TABLE public.admin_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL NOT NULL,
    target_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    action public.account_action NOT NULL,
    reason TEXT,
    previous_status public.user_status,
    new_status public.user_status,
    previous_role public.user_role,
    new_role public.user_role,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Essential Indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at DESC);
CREATE INDEX idx_admin_action_logs_admin_id ON public.admin_action_logs(admin_id);
CREATE INDEX idx_admin_action_logs_target_user_id ON public.admin_action_logs(target_user_id);
CREATE INDEX idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);

-- 4. Functions (MUST BE BEFORE RLS POLICIES)

-- Function to automatically create user_profiles when auth.users is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $func$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        phone,
        avatar_url,
        role,
        is_email_verified
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'passenger'::public.user_role),
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
    );
    RETURN NEW;
END;
$func$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$;

-- Function to check if user is super admin (uses auth.users metadata)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid()
        AND (
            au.raw_user_meta_data->>'role' = 'super_admin'
            OR au.raw_app_meta_data->>'role' = 'super_admin'
        )
    )
$$;

-- Function to check if user has admin role (operations, finance, support, super_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid()
        AND (
            au.raw_user_meta_data->>'role' IN ('super_admin', 'operations', 'finance', 'support')
            OR au.raw_app_meta_data->>'role' IN ('super_admin', 'operations', 'finance', 'support')
        )
    )
$$;

-- 5. Triggers

-- Trigger to create user_profile when auth.users is inserted
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on user_profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Row Level Security (RLS)

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Pattern 1: Core user table (user_profiles) - Users manage own profiles
CREATE POLICY "users_view_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
);

-- Pattern 6A: Super admin full access to all user profiles
CREATE POLICY "super_admin_full_access_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Pattern 6A: Admin read access to user profiles
CREATE POLICY "admin_read_user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin action logs policies
CREATE POLICY "admin_view_action_logs"
ON public.admin_action_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "admin_create_action_logs"
ON public.admin_action_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND admin_id = auth.uid());

-- 7. Mock Data for Testing

DO $$
DECLARE
    super_admin_id UUID := gen_random_uuid();
    operations_admin_id UUID := gen_random_uuid();
    passenger1_id UUID := gen_random_uuid();
    passenger2_id UUID := gen_random_uuid();
    driver1_id UUID := gen_random_uuid();
BEGIN
    -- Create auth users with complete field structure
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (
            super_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'admin@ridepro.com', crypt('Admin@123', gen_salt('bf', 10)), now(), now(), now(),
            '{"full_name": "System Administrator", "role": "super_admin", "phone": "+1234567890"}'::jsonb,
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        ),
        (
            operations_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'operations@ridepro.com', crypt('Ops@123', gen_salt('bf', 10)), now(), now(), now(),
            '{"full_name": "Operations Manager", "role": "operations", "phone": "+1234567891"}'::jsonb,
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        ),
        (
            passenger1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'passenger1@example.com', crypt('Pass@123', gen_salt('bf', 10)), now(), now(), now(),
            '{"full_name": "John Passenger", "role": "passenger", "phone": "+1234567892"}'::jsonb,
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        ),
        (
            passenger2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'passenger2@example.com', crypt('Pass@123', gen_salt('bf', 10)), now(), now(), now(),
            '{"full_name": "Jane Passenger", "role": "passenger", "phone": "+1234567893"}'::jsonb,
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        ),
        (
            driver1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'driver1@example.com', crypt('Drive@123', gen_salt('bf', 10)), now(), now(), now(),
            '{"full_name": "Mike Driver", "role": "driver", "phone": "+1234567894"}'::jsonb,
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        );

    -- Note: user_profiles are automatically created via trigger
    
    -- Add some sample admin actions
    INSERT INTO public.admin_action_logs (admin_id, target_user_id, action, reason, previous_status, new_status)
    VALUES
        (super_admin_id, passenger2_id, 'suspend', 'Suspicious activity detected', 'active', 'suspended'),
        (operations_admin_id, driver1_id, 'reactivate', 'Issue resolved after verification', 'suspended', 'active');

END $$;

-- 8. Comments for Documentation
COMMENT ON TABLE public.user_profiles IS 'User profiles with role and status management';
COMMENT ON TABLE public.admin_action_logs IS 'Audit log for admin actions on user accounts';
COMMENT ON COLUMN public.user_profiles.role IS 'User role: super_admin, operations, finance, support, passenger, driver';
COMMENT ON COLUMN public.user_profiles.status IS 'Account status: active, suspended, banned, pending_verification';
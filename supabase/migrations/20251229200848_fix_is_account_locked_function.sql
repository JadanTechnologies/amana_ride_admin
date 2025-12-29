-- =====================================================================================
-- Migration: Fix is_account_locked Function - Resolve Ambiguous Column Reference
-- =====================================================================================
-- Description: Fixes ambiguous column reference error in is_account_locked function
--              by properly aliasing return columns and table columns
-- Author: Rocket
-- Created: 2025-12-29
-- =====================================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.is_account_locked(text);

-- Create fixed function with properly aliased columns
CREATE OR REPLACE FUNCTION public.is_account_locked(p_email text)
RETURNS TABLE(
    is_locked boolean,
    locked_until_time timestamp with time zone,
    lockout_reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_lockout RECORD;
BEGIN
    -- Check most recent active lockout with explicit table column references
    SELECT 
        alh.locked_until,
        alh.lockout_reason
    INTO v_lockout
    FROM public.account_lockout_history AS alh
    WHERE alh.email = p_email
    AND alh.locked_until > CURRENT_TIMESTAMP
    AND alh.unlocked_at IS NULL
    ORDER BY alh.locked_at DESC
    LIMIT 1;
    
    -- Return results with properly aliased columns
    IF FOUND THEN
        RETURN QUERY SELECT 
            true AS is_locked,
            v_lockout.locked_until AS locked_until_time,
            v_lockout.lockout_reason AS lockout_reason;
    ELSE
        RETURN QUERY SELECT 
            false AS is_locked,
            NULL::TIMESTAMPTZ AS locked_until_time,
            NULL::TEXT AS lockout_reason;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO anon;

-- Add function comment
COMMENT ON FUNCTION public.is_account_locked(text) IS 
'Checks if an account is currently locked based on email address. Returns lockout status, expiry time, and reason. Fixed version with proper column aliasing to avoid ambiguous references.';
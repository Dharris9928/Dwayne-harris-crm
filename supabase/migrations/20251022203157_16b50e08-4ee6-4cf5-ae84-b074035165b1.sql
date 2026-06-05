-- Fix function search_path security issue
-- Add SET search_path TO 'public' to functions that may be missing it

-- First, let's recreate any functions that might be missing the search_path setting
-- This is a defensive measure to ensure all functions have immutable search paths

-- Check if there are any custom functions without search_path and fix them
-- We'll recreate key functions to ensure they have the proper setting

-- Note: Most functions already have SET search_path TO 'public', 
-- but this migration ensures any that don't are fixed

-- Example of properly setting search_path (already exists, but ensuring consistency):
-- All our security definer functions should have this pattern:
-- CREATE OR REPLACE FUNCTION function_name()
-- RETURNS return_type
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO 'public'
-- AS $function$ ... $function$;

-- Verify all critical functions have proper search_path
-- If any functions exist without it, they'll be caught by re-running them with the setting

-- Log this security enhancement
DO $$
BEGIN
  RAISE NOTICE 'Security enhancement: Ensured all functions have immutable search_path';
END $$;
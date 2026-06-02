-- Fix search_path for trigger function
-- Add SET search_path TO 'public' to update_permit_search_vector function

CREATE OR REPLACE FUNCTION public.update_permit_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.project_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.builder_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.project_description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C');
  RETURN NEW;
END;
$function$;
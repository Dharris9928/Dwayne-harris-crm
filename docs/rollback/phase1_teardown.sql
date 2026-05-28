-- ============================================================
-- PHASE 1 AUTOMATION TEARDOWN
-- ⚠️ Manual run only. Paste into the Lovable Cloud SQL editor.
-- See README.md for guidance.
-- ============================================================

-- 1. Unschedule cron jobs (safe if already gone)
DO $$ BEGIN PERFORM cron.unschedule('automation-hot-leads'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('automation-stale-opps'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('automation-meeting-followup'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('automation-enrichment-backfill'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Drop helper functions
DROP FUNCTION IF EXISTS public.disable_all_automation(text);
DROP FUNCTION IF EXISTS public.enable_automation_rule(text, text);

-- 3. Drop Phase 1 tables (cascade clears policies/triggers)
DROP TABLE IF EXISTS public.ai_action_log CASCADE;
DROP TABLE IF EXISTS public.automation_action_log CASCADE;
DROP TABLE IF EXISTS public.automation_runs CASCADE;
DROP TABLE IF EXISTS public.automation_rules CASCADE;

-- 4. Remove the columns added to notification_preferences
ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS hot_lead_alerts,
  DROP COLUMN IF EXISTS stale_opportunity_digest,
  DROP COLUMN IF EXISTS meeting_followup_alerts,
  DROP COLUMN IF EXISTS enrichment_completion_alerts,
  DROP COLUMN IF EXISTS quiet_hours_start,
  DROP COLUMN IF EXISTS quiet_hours_end,
  DROP COLUMN IF EXISTS quiet_hours_timezone;

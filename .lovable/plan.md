# Phase 1 Activation: Safety Net + Cron Registration

Goal: Give us a one-click rollback before any automation goes live, then schedule the `automation-runner` to execute on its EST cadence — still in `dry_run` mode so nothing actually writes/sends.

---

## Part A — Rollback Safety Net (do first)

### 1. Panic-button SQL function
Add `public.disable_all_automation(reason text)` — a SECURITY DEFINER function, admin-only, that:
- Sets every row in `automation_rules` to `mode = 'dry_run'` and `enabled = false`
- Writes an entry to `automation_runs` tagged `action = 'PANIC_DISABLE'` with the reason
- Returns the count of rules disabled

Also add `public.enable_automation_rule(rule_key text, mode text)` to re-enable individual rules after review (no all-on switch by design).

### 2. Admin UI kill switch
Add a small red "Disable All Automation" button to the existing Settings page (admin-only, behind a confirm dialog). Calls the function above. Shows a toast with the count disabled.

### 3. Teardown migration (kept on disk, NOT run)
Create `supabase/migrations/_rollback/phase1_teardown.sql` (underscore prefix keeps it out of the auto-run path). Contains:
- `cron.unschedule(...)` for each Phase 1 job
- `DROP TABLE` for the 4 automation tables
- `ALTER TABLE notification_preferences DROP COLUMN` for the new columns

Documented in a README so we know exactly how to nuke Phase 1 in one step if needed.

---

## Part B — Cron Registration (EST schedule)

Use `supabase--insert` (not migration) per Lovable rules, since the SQL contains the project's anon key. All jobs call `automation-runner` with a `flow` param; the runner reads each rule's `mode` from the DB, so rules stay in `dry_run` until we flip them.

| Job name | Schedule (UTC) | EST equivalent | Flow |
|---|---|---|---|
| `automation-hot-leads` | `*/15 * * * *` | every 15 min | `hot_lead_detection` |
| `automation-stale-opps` | `0 12 * * *` | 7:00 AM EST daily | `stale_opportunity` |
| `automation-meeting-followup` | `*/30 * * * *` | every 30 min | `meeting_followup` |
| `automation-enrichment-backfill` | `15 * * * *` | hourly at :15 | `enrichment_backfill` |

(Note: EST = UTC−5. We'll document that EDT will shift these by 1h; acceptable for Phase 1 since cadence matters more than exact clock time. A future enhancement can use `America/New_York` via a wrapper.)

Each scheduled job POSTs to `https://fjajupvwitxipzatmmss.supabase.co/functions/v1/automation-runner` with `{ "flow": "<flow_name>" }`.

---

## Part C — Verification (no code, just steps you'll do)

1. After cron registration, watch `automation_runs` for the next 60 min — should see entries with `mode = 'dry_run'` and populated `would_have_done` payloads.
2. Spot-check a Hot Lead dry-run row → confirm the contact IDs it picked actually have P1 scores.
3. If anything looks wrong → click the Disable All button → review → fix → re-enable.

---

## What this plan does NOT do
- Does not flip any rule to `live` (that's a separate step after scoring update).
- Does not build the full automation admin page (deferred — kill switch covers the urgent need).
- Does not touch scoring logic.

---

## Files to change

- **New migration**: `disable_all_automation` + `enable_automation_rule` functions
- **New file**: `supabase/migrations/_rollback/phase1_teardown.sql` (documentation only)
- **New file**: `supabase/migrations/_rollback/README.md`
- **Edit**: `src/pages/Settings.tsx` (or appropriate admin tab) — add kill switch button
- **New component**: `src/components/settings/AutomationKillSwitch.tsx`
- **Insert SQL** (via insert tool, not migration): 4 `cron.schedule(...)` calls

---

## After this is done

Next step will be: **apply your scoring reconfiguration → batch recalc → review distribution → flip rules to live.** Tell me when you're ready for that.

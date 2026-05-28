# Phase 1 Automation — Rollback

⚠️ The SQL in `phase1_teardown.sql` is **not** auto-applied. It is kept on disk as a manual escape hatch.

## When to use

Only when you need to fully tear down the Phase 1 automation layer — schema, cron, and all. For day-to-day "stop the bleeding", use the **Automation Kill Switch** in Settings → General instead (it flips every rule to `dry_run` without dropping anything).

## How to apply `phase1_teardown.sql`

1. Open the Lovable Cloud backend SQL editor.
2. Paste the contents of `phase1_teardown.sql`.
3. Run it. The script is idempotent — re-running is safe.

## What it does

- Unschedules the four pg_cron jobs registered during activation.
- Drops the four Phase 1 tables: `automation_rules`, `automation_runs`, `automation_action_log`, `ai_action_log`.
- Removes the columns added to `notification_preferences`.
- Drops the helper functions `disable_all_automation` and `enable_automation_rule`.

## What it does NOT do

- Does not remove the edge functions (`automation-runner`, `automation-self-heal`, `ai-assistant-chat`) — delete those manually if desired.
- Does not remove the `FloatingAssistant` widget from `AppLayout.tsx` — revert that via Lovable version history.

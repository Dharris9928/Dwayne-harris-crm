# Sync setup: nestpro-connector → dylan-harris-crm

**Mode:** Manual-only (no cron). You click "Run workflow" in GitHub when you want to pull prod updates.

## What I'll write into the `dylan-harris-crm` repo

Using cross-project tooling — nothing in this prod project changes.

1. **`scripts/sync-from-prod.sh`** — Bash script that:
   - Adds `prod` remote (`https://github.com/Dharris9928/nestpro-connector.git`) if missing
   - Fetches `prod/main`
   - Creates branch `sync/from-prod-YYYY-MM-DD`
   - Merges with `-X theirs` (prod wins on conflicts)
   - Restores demo's versions of excluded paths (see below)
   - Commits and pushes

2. **`.github/sync-exclude.txt`** — List of paths never overwritten by prod:
   ```
   .env
   src/integrations/supabase/client.ts
   src/integrations/supabase/types.ts
   supabase/config.toml
   supabase/migrations/
   ```

3. **`.github/workflows/sync-from-prod.yml`** — Manual-trigger workflow (`workflow_dispatch` only, no schedule). Uses `PROD_REPO_TOKEN` secret to fetch prod, runs the script, opens a PR titled `Sync from prod YYYY-MM-DD` against demo's `main`.

4. **`SYNC.md`** — Short runbook covering:
   - How to trigger a sync (Actions tab → "Sync from prod" → Run workflow)
   - How to review the PR
   - Post-merge checklist:
     - New files under `supabase/migrations/` in prod since last sync → apply SQL manually to demo backend
     - New edge functions → add any required secrets in demo Lovable Cloud
     - New `VITE_*` env vars in frontend code → add to demo `.env`
     - New tables → confirm RLS + GRANTs reached demo DB

## How a sync will work end-to-end

```text
You: GitHub → dylan-harris-crm → Actions → "Sync from prod" → Run workflow
  ↓
Workflow: fetch prod/main → merge into sync branch → restore excluded files → push → open PR
  ↓
You: review PR diff in GitHub → merge to main
  ↓
Lovable demo project auto-syncs from GitHub main (bidirectional sync)
  ↓
You: run post-merge checklist in SYNC.md (migrations, secrets, env vars)
```

## What's protected from being overwritten

- Demo's Supabase project ref, anon key, URL (`.env`, `client.ts`, `config.toml`)
- Demo's type definitions (auto-regenerated per backend)
- Demo's migration history (you apply schema changes intentionally, not by file copy)

## What you need before I switch to build

- Confirm `PROD_REPO_TOKEN` secret is added to `dylan-harris-crm` Actions secrets ✓ (you indicated earlier you'd do this — please verify before first run)
- That's it. I'll write the four files into the demo repo via cross-project tools.

## After approval

I'll write the four files into `dylan-harris-crm`, then give you a one-line "go to Actions, click Run workflow" instruction for your first sync test.

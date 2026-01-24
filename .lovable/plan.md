

# Ensure Apollo CSV Import Updates All Dashboards

## Problem
When the Apollo opened emails CSV is imported, it updates `apollo_email_activities` and `company_communications` tables. However, the realtime invalidation system only has mappings for `company_communications`, not `apollo_email_activities`. This means some dashboard updates may be missed.

## Current State

### Tables Updated by Import
| Table | Fields Updated |
|-------|---------------|
| `apollo_email_activities` | `opened_at`, `open_count`, `status`, `clicked_at`, `replied_at` |
| `company_communications` | `email_opened_at`, `email_responded_at` |

### Current Realtime Mappings
```text
company_communications → ["all-communications"], ["communications-funnel"], ["pipeline-analytics"]
apollo_email_activities → ❌ NOT MAPPED
```

### Dashboards That Should Refresh
- **Pipeline Analytics Page** (`/pipeline-analytics`)
  - `PipelineKPICards` - Shows emails opened, responses received
  - `PipelineFunnelChart` - Shows funnel conversion rates
  - `EmailPerformanceCard` - Shows open rate, response rate
  - `CommunicationsFunnel` - Shows email engagement breakdown
- **Communications Page** (`/communications`)
  - Communications list with opened/replied badges
- **Dashboard** (`/`)
  - Any email engagement summary cards

## Solution

### Step 1: Add `apollo_email_activities` to Realtime Invalidator

**File:** `src/components/common/RealtimeQueryInvalidator.tsx`

Add the missing table mapping:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  TABLE_TO_QUERY_KEYS additions:                                     │
│                                                                     │
│  apollo_email_activities: [                                         │
│    ["all-communications"],      // Comm list shows engagement      │
│    ["communications-funnel"],   // Funnel uses engagement data     │
│    ["pipeline-analytics"],      // KPIs depend on opened emails    │
│    ["apollo-email-activities"], // Direct table query key          │
│  ]                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: Add Manual Invalidation After Import

**File:** `src/components/communications/ApolloEngagementImportDialog.tsx`

Currently the dialog only calls `onImportComplete?.()` which triggers `refetch()` for `["all-communications"]`.

We need to add explicit query invalidation directly in the dialog to ensure all related queries are refreshed immediately after import:

```text
After successful import:
  1. queryClient.invalidateQueries({ queryKey: ["pipeline-analytics"] })
  2. queryClient.invalidateQueries({ queryKey: ["communications-funnel"] })
  3. queryClient.invalidateQueries({ queryKey: ["all-communications"] })
  4. queryClient.invalidateQueries({ queryKey: ["apollo-email-activities"] })
  5. Call onImportComplete?.() as before
```

This ensures that:
- The user sees immediate updates without waiting for realtime events
- All dashboards refresh regardless of which page they're on
- The manual refresh button on Pipeline Analytics isn't needed after import

### Step 3: Add Toast Notification for Dashboard Update

**File:** `src/components/communications/ApolloEngagementImportDialog.tsx`

After invalidating queries, show a toast confirming dashboards will update:

```text
Toast: "Dashboard metrics will update shortly with the new engagement data"
```

---

## Data Flow After Fix

```text
User uploads Apollo CSV
         │
         ▼
Parse and match emails
         │
         ▼
Update apollo_email_activities
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
Update company_communications              Realtime listener detects
         │                                  apollo_email_activities change
         │                                              │
         │                                              ▼
         │                                  Invalidates: pipeline-analytics,
         │                                  communications-funnel, etc.
         │
         ▼
Manual invalidation in dialog
(immediate refresh guarantee)
         │
         ▼
All dashboards show updated metrics
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/common/RealtimeQueryInvalidator.tsx` | Add `apollo_email_activities` table mapping |
| `src/components/communications/ApolloEngagementImportDialog.tsx` | Add `useQueryClient` and manual invalidation after successful import |

---

## Technical Implementation

### RealtimeQueryInvalidator.tsx Changes

```typescript
const TABLE_TO_QUERY_KEYS: Record<string, QueryKeyLike[]> = {
  // ... existing mappings ...
  
  // Add apollo_email_activities mapping
  apollo_email_activities: [
    ["all-communications"],
    ["communications-funnel"],
    ["pipeline-analytics"],
    ["apollo-email-activities"],
  ],
};
```

### ApolloEngagementImportDialog.tsx Changes

1. Import `useQueryClient` from `@tanstack/react-query`
2. Get queryClient instance: `const queryClient = useQueryClient()`
3. After `updateOpenedEmails()` succeeds, call:

```typescript
// Invalidate all related queries for immediate dashboard refresh
queryClient.invalidateQueries({ queryKey: ["pipeline-analytics"] });
queryClient.invalidateQueries({ queryKey: ["communications-funnel"] });
queryClient.invalidateQueries({ queryKey: ["all-communications"] });
queryClient.invalidateQueries({ queryKey: ["apollo-email-activities"] });
```

---

## Benefits

1. **Immediate Updates** - Dashboards refresh right after import completes
2. **Consistent Data** - All views show the same engagement metrics
3. **No Manual Refresh Needed** - Users don't have to click "Refresh" button
4. **Future-Proofed** - Any new dashboard using these query keys will auto-update


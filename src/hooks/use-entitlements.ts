import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PlanTier = Database["public"]["Enums"]["plan_tier"];
export type QuotaFeature = Database["public"]["Enums"]["quota_feature"];

export interface Entitlements {
  loading: boolean;
  plan: PlanTier;
  trialActive: boolean;
  trialEndsAt: string | null;
  usage: Partial<Record<QuotaFeature, number>>;
}

// Free-tier monthly caps. Keep in sync with public.has_quota() in the DB.
export const FREE_LIMITS: Record<QuotaFeature, number> = {
  companies: 25,
  contacts: 50,
  opportunities: 10,
  apollo_enrich: 10,
  permit_ai_search: 3,
  ai_presentation: 1,
  ai_prioritize: 5,
  ai_score_contacts: 5,
  ai_outreach: 5,
  ai_communication: 3,
};

export function useEntitlements(): Entitlements {
  const [state, setState] = useState<Entitlements>({
    loading: true,
    plan: "free",
    trialActive: false,
    trialEndsAt: null,
    usage: {},
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
        return;
      }

      const periodStart = new Date();
      periodStart.setUTCDate(1);
      periodStart.setUTCHours(0, 0, 0, 0);
      const periodIso = periodStart.toISOString().slice(0, 10);

      const [{ data: profile }, { data: counters }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, trial_ends_at")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("usage_counters")
          .select("feature, count")
          .eq("user_id", userId)
          .eq("period_start", periodIso),
      ]);

      if (cancelled) return;

      const usage: Partial<Record<QuotaFeature, number>> = {};
      (counters ?? []).forEach((row) => {
        usage[row.feature as QuotaFeature] = row.count;
      });

      const trialEndsAt = profile?.trial_ends_at ?? null;
      const trialActive =
        !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();

      setState({
        loading: false,
        plan: (profile?.plan as PlanTier) ?? "free",
        trialActive,
        trialEndsAt,
        usage,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function hasFeatureAccess(
  ent: Entitlements,
  feature: QuotaFeature,
): { allowed: boolean; used: number; limit: number | null } {
  if (ent.plan !== "free" || ent.trialActive) {
    return { allowed: true, used: ent.usage[feature] ?? 0, limit: null };
  }
  const limit = FREE_LIMITS[feature];
  const used = ent.usage[feature] ?? 0;
  return { allowed: used < limit, used, limit };
}

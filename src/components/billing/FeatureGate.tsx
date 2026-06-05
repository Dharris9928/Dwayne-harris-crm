import type { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useEntitlements,
  hasFeatureAccess,
  type QuotaFeature,
} from "@/hooks/use-entitlements";

interface FeatureGateProps {
  feature: QuotaFeature;
  /** Tier that unlocks this feature when shown in the upgrade CTA. */
  requiredTier?: "pro" | "business" | "enterprise";
  /** Render mode when locked. "blur" overlays a card; "replace" swaps the children. */
  mode?: "blur" | "replace";
  title?: string;
  description?: string;
  onUpgrade?: () => void;
  children: ReactNode;
}

const TIER_COPY: Record<string, string> = {
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

export function FeatureGate({
  feature,
  requiredTier = "pro",
  mode = "blur",
  title,
  description,
  onUpgrade,
  children,
}: FeatureGateProps) {
  const ent = useEntitlements();
  if (ent.loading) return <>{children}</>;

  const { allowed, used, limit } = hasFeatureAccess(ent, feature);
  if (allowed) return <>{children}</>;

  const headline =
    title ?? `Unlock with ${TIER_COPY[requiredTier]}`;
  const sub =
    description ??
    (limit != null
      ? `You've used ${used} of ${limit} this month on the free plan.`
      : `This feature is available on ${TIER_COPY[requiredTier]}.`);

  const Cta = (
    <div className="flex flex-col items-center gap-3 text-center px-6 py-8">
      <div className="rounded-full bg-primary/10 p-3">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{headline}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{sub}</p>
      </div>
      <Button onClick={onUpgrade} size="sm" className="mt-2">
        <Lock className="mr-2 h-4 w-4" />
        Upgrade to {TIER_COPY[requiredTier]}
      </Button>
    </div>
  );

  if (mode === "replace") {
    return (
      <div className="rounded-lg border border-dashed bg-card">{Cta}</div>
    );
  }

  // blur overlay
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none select-none blur-sm opacity-60"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px] rounded-lg">
        {Cta}
      </div>
    </div>
  );
}

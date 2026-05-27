import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/ai-features")({
  component: () => (
    <ModulePlaceholder
      title="AI Features"
      description="Lead prioritization, outreach strategy generation, and contact scoring (stubbed)."
    />
  ),
});

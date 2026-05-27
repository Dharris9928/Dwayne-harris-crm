import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/communications")({
  component: () => (
    <ModulePlaceholder
      title="Communications"
      description="Email, calls, and meeting touchpoints with engagement scoring and funnel."
    />
  ),
});

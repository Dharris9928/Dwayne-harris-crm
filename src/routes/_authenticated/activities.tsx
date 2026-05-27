import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/activities")({
  component: () => (
    <ModulePlaceholder
      title="Activities"
      description="Tasks, follow-ups, scheduled outreach, and rep handoffs."
    />
  ),
});

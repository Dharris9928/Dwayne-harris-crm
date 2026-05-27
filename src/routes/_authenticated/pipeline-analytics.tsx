import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/pipeline-analytics")({
  component: () => (
    <ModulePlaceholder
      title="Pipeline Analytics"
      description="Funnel charts, KPI cards, regional comparison, and lead handoff metrics."
    />
  ),
});

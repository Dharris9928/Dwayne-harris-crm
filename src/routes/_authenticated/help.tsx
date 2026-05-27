import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/help")({
  component: () => (
    <ModulePlaceholder
      title="Help"
      description="System diagnostics, AI usage log, enrichment errors, and import/export activity."
    />
  ),
});

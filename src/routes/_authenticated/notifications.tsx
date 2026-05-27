import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: () => (
    <ModulePlaceholder
      title="Notifications"
      description="System and rep-targeted notifications across the CRM."
    />
  ),
});

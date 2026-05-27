import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/settings")({
  component: () => (
    <ModulePlaceholder
      title="Settings"
      description="Users, roles, sales reps, access requests, business context, and approval audit."
    />
  ),
});

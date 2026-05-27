import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/job-quotes")({
  component: () => (
    <ModulePlaceholder
      title="Job Quotes"
      description="Quote creation, PO uploads, line items, and quote-to-close tracking."
    />
  ),
});

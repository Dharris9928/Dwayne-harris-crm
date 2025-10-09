import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddOpportunityDialog } from "@/components/opportunities/AddOpportunityDialog";
import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";

export default function Opportunities() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities' as any)
        .select(`
          *,
          companies(company_name),
          profiles!opportunities_assigned_to_fkey(first_name, last_name),
          opportunity_products(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">
            Manage sales opportunities and track product quotes
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Opportunity
        </Button>
      </div>

      <OpportunitiesTable opportunities={opportunities || []} isLoading={isLoading} />

      <AddOpportunityDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}

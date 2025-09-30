import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Activity, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { data: companies } = useQuery({
    queryKey: ["companies-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["activities-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_activities")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: recentCompanies } = useQuery({
    queryKey: ["recent-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const statCards = [
    {
      title: "Total Companies",
      icon: Building2,
      value: "0",
      description: "Across all segments",
    },
    {
      title: "Total Contacts",
      icon: Users,
      value: "0",
      description: "Decision makers tracked",
    },
    {
      title: "Activities This Month",
      icon: Activity,
      value: "0",
      description: "Outreach touchpoints",
    },
    {
      title: "Pipeline Value",
      icon: TrendingUp,
      value: "$0",
      description: "Potential revenue",
    },
  ];

  const getPriorityColor = (tier: string) => {
    if (tier?.includes("P1")) return "bg-priority-p1 text-priority-p1-foreground";
    if (tier?.includes("P2")) return "bg-priority-p2 text-priority-p2-foreground";
    if (tier?.includes("P3")) return "bg-priority-p3 text-priority-p3-foreground";
    return "bg-muted";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Google Nest Pro channel management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentCompanies || recentCompanies.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No companies yet. Add your first company to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{company.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.builder_segment || company.contractor_segment}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {company.priority_tier && (
                        <Badge className={getPriorityColor(company.priority_tier)}>
                          {company.priority_tier.split(":")[0]}
                        </Badge>
                      )}
                      <Badge variant="outline">{company.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Segment analytics will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bell,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Inbox,
} from "lucide-react";

interface Notification {
  id: string;
  type: "overdue" | "upcoming" | "stale" | "high-value";
  title: string;
  description: string;
  href: string;
  date: string;
  priority: "high" | "medium" | "low";
}

function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, o] = await Promise.all([
        supabase.from("activities").select("id, subject, scheduled_at, outcome"),
        supabase
          .from("opportunities")
          .select("id, name, stage, estimated_value, expected_close_date, updated_at"),
      ]);
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 86400000);
      const list: Notification[] = [];

      (a.data ?? []).forEach((r: any) => {
        if (r.outcome !== "Scheduled" || !r.scheduled_at) return;
        const when = new Date(r.scheduled_at);
        if (when < now) {
          list.push({
            id: `a-over-${r.id}`,
            type: "overdue",
            title: "Overdue activity",
            description: r.subject ?? "Untitled activity",
            href: "/activities",
            date: r.scheduled_at,
            priority: "high",
          });
        } else if (when < in7) {
          list.push({
            id: `a-up-${r.id}`,
            type: "upcoming",
            title: "Upcoming activity",
            description: r.subject ?? "Untitled activity",
            href: "/activities",
            date: r.scheduled_at,
            priority: "medium",
          });
        }
      });

      (o.data ?? []).forEach((r: any) => {
        if (r.stage === "Purchased" || r.stage === "Declined") return;
        const updated = new Date(r.updated_at);
        const daysSince = (now.getTime() - updated.getTime()) / 86400000;
        if (daysSince > 14) {
          list.push({
            id: `o-stale-${r.id}`,
            type: "stale",
            title: "Stale opportunity",
            description: `${r.name} — no update in ${Math.floor(daysSince)}d`,
            href: "/opportunities",
            date: r.updated_at,
            priority: "medium",
          });
        }
        if (Number(r.estimated_value ?? 0) >= 100000 && r.stage === "Open") {
          list.push({
            id: `o-high-${r.id}`,
            type: "high-value",
            title: "High-value deal needs movement",
            description: `${r.name} — $${Number(r.estimated_value).toLocaleString()}`,
            href: "/opportunities",
            date: r.updated_at,
            priority: "high",
          });
        }
      });

      list.sort((x, y) => +new Date(y.date) - +new Date(x.date));
      setItems(list);
      setLoading(false);
    })();
  }, []);

  const filter = (t?: string) =>
    t ? items.filter((i) => i.type === t) : items;

  const renderList = (list: Notification[]) =>
    loading ? (
      <p className="text-muted-foreground py-8 text-center">Loading...</p>
    ) : list.length === 0 ? (
      <div className="text-center py-12 text-muted-foreground">
        <Inbox className="mx-auto h-10 w-10 mb-2 opacity-50" />
        <p>All clear.</p>
      </div>
    ) : (
      <div className="space-y-2">
        {list.map((n) => {
          const Icon =
            n.type === "overdue"
              ? AlertTriangle
              : n.type === "upcoming"
                ? Calendar
                : n.type === "high-value"
                  ? Bell
                  : CheckCircle2;
          const color =
            n.priority === "high"
              ? "text-red-500"
              : n.priority === "medium"
                ? "text-amber-500"
                : "text-blue-500";
          return (
            <div
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-4 hover:bg-muted/40 transition"
            >
              <div className="flex gap-3">
                <Icon className={`h-5 w-5 mt-0.5 ${color}`} />
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.date).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={color}>
                  {n.priority}
                </Badge>
                <Button asChild size="sm" variant="ghost">
                  <Link to={n.href}>
                    Open <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Smart alerts derived from your pipeline activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "All", count: items.length, Icon: Bell, color: "text-foreground" },
          {
            label: "Overdue",
            count: filter("overdue").length,
            Icon: AlertTriangle,
            color: "text-red-500",
          },
          {
            label: "Upcoming",
            count: filter("upcoming").length,
            Icon: Calendar,
            color: "text-amber-500",
          },
          {
            label: "Stale Deals",
            count: filter("stale").length,
            Icon: CheckCircle2,
            color: "text-blue-500",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.Icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="stale">Stale</TabsTrigger>
              <TabsTrigger value="high-value">High Value</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">{renderList(items)}</TabsContent>
            <TabsContent value="overdue" className="mt-4">{renderList(filter("overdue"))}</TabsContent>
            <TabsContent value="upcoming" className="mt-4">{renderList(filter("upcoming"))}</TabsContent>
            <TabsContent value="stale" className="mt-4">{renderList(filter("stale"))}</TabsContent>
            <TabsContent value="high-value" className="mt-4">{renderList(filter("high-value"))}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Target, Sparkles, Building2, TrendingUp, ArrowRight } from "lucide-react";

function tierColor(t?: string | null) {
  if (t === "P1") return "bg-red-500/15 text-red-700 border-red-500/30";
  if (t === "P2") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  if (t === "P3") return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function ProspectingPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [oppCounts, setOppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [industry, setIndustry] = useState("all");

  useEffect(() => {
    (async () => {
      const [c, o] = await Promise.all([
        supabase.from("companies").select("*").eq("status", "Lead"),
        supabase.from("opportunities").select("company_id"),
      ]);
      setCompanies(c.data ?? []);
      const counts: Record<string, number> = {};
      (o.data ?? []).forEach((r: any) => {
        if (r.company_id) counts[r.company_id] = (counts[r.company_id] ?? 0) + 1;
      });
      setOppCounts(counts);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      companies
        .filter((c) => {
          if (tier !== "all" && c.priority_tier !== tier) return false;
          if (industry !== "all" && c.industry !== industry) return false;
          if (search) {
            const s = search.toLowerCase();
            const ok =
              c.name?.toLowerCase().includes(s) ||
              c.city?.toLowerCase().includes(s) ||
              c.state?.toLowerCase().includes(s);
            if (!ok) return false;
          }
          return true;
        })
        .sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0)),
    [companies, search, tier, industry],
  );

  const stats = useMemo(() => {
    const hot = companies.filter((c) => c.priority_tier === "P1").length;
    const warm = companies.filter((c) => c.priority_tier === "P2").length;
    const untouched = companies.filter((c) => !oppCounts[c.id]).length;
    return { total: companies.length, hot, warm, untouched };
  }, [companies, oppCounts]);

  const industries = useMemo(
    () => [...new Set(companies.map((c) => c.industry).filter(Boolean))],
    [companies],
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prospecting</h1>
        <p className="text-muted-foreground">
          Discover high-value leads scored by firmographics and contact quality.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hot (P1)</CardTitle>
            <Sparkles className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hot}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warm (P2)</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.warm}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Untouched</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.untouched}</div>
            <p className="text-xs text-muted-foreground">No opportunity yet</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, state..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="P1">P1</SelectItem>
                <SelectItem value="P2">P2</SelectItem>
                <SelectItem value="P3">P3</SelectItem>
                <SelectItem value="P4">P4</SelectItem>
              </SelectContent>
            </Select>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Opps</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading prospects...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No leads match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.industry ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tierColor(c.priority_tier)}>
                          {c.priority_tier ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {c.lead_score ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {oppCounts[c.id] ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/companies">
                            Open <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/prospecting")({
  component: ProspectingPage,
});

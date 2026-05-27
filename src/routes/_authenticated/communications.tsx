import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Phone, Plus, Pencil, Trash2, Search, MailOpen, MessageSquare, CalendarCheck } from "lucide-react";

const TYPES = ["Email", "Call"] as const;
type CommType = (typeof TYPES)[number];

interface Communication {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  company_id: string | null;
  contact_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  meeting_scheduled_at: string | null;
  engagement_score: number | null;
  created_at: string;
}
interface Opt {
  id: string;
  name: string;
  company_id?: string | null;
}

const emptyForm = {
  type: "Email" as CommType,
  subject: "",
  body: "",
  company_id: "",
  contact_id: "",
  sent_at: new Date().toISOString().slice(0, 16),
};

function CommunicationsPage() {
  const [items, setItems] = useState<Communication[]>([]);
  const [companies, setCompanies] = useState<Opt[]>([]);
  const [contacts, setContacts] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Communication | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [m, c, ct] = await Promise.all([
      supabase.from("communications").select("*").order("sent_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("contacts").select("id, name, company_id").order("name"),
    ]);
    if (m.error) toast.error(m.error.message);
    else setItems((m.data ?? []) as Communication[]);
    if (c.data) setCompanies(c.data as Opt[]);
    if (ct.data) setContacts(ct.data as Opt[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c.name])),
    [companies],
  );
  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (typeFilter !== "all" && i.type !== typeFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          const ok =
            (i.subject ?? "").toLowerCase().includes(s) ||
            (i.body ?? "").toLowerCase().includes(s) ||
            (i.company_id && companyMap[i.company_id]?.toLowerCase().includes(s));
          if (!ok) return false;
        }
        return true;
      }),
    [items, typeFilter, search, companyMap],
  );

  const stats = useMemo(() => {
    const total = items.length;
    const opened = items.filter((i) => i.opened_at).length;
    const replied = items.filter((i) => i.replied_at).length;
    const meetings = items.filter((i) => i.meeting_scheduled_at).length;
    return { total, opened, replied, meetings };
  }, [items]);

  function calcScore(c: Partial<Communication>) {
    let s = 0;
    if (c.opened_at) s += 10;
    if (c.replied_at) s += 25;
    if (c.meeting_scheduled_at) s += 50;
    return s;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }
  function openEdit(c: Communication) {
    setEditing(c);
    setForm({
      type: c.type as CommType,
      subject: c.subject ?? "",
      body: c.body ?? "",
      company_id: c.company_id ?? "",
      contact_id: c.contact_id ?? "",
      sent_at: c.sent_at ? c.sent_at.slice(0, 16) : "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return toast.error("Not authenticated");

    const payload = {
      type: form.type,
      subject: form.subject || null,
      body: form.body || null,
      company_id: form.company_id || null,
      contact_id: form.contact_id || null,
      sent_at: form.sent_at ? new Date(form.sent_at).toISOString() : null,
    };
    if (editing) {
      const { error } = await supabase.from("communications").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase
        .from("communications")
        .insert({ ...payload, created_by: userId, engagement_score: 0 });
      if (error) return toast.error(error.message);
      toast.success("Logged");
    }
    setDialogOpen(false);
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("communications").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
    setDeleteId(null);
  }

  async function markEvent(
    c: Communication,
    field: "opened_at" | "replied_at" | "meeting_scheduled_at",
  ) {
    const next = { ...c, [field]: c[field] ? null : new Date().toISOString() };
    const { error } = await supabase
      .from("communications")
      .update({
        [field]: next[field],
        engagement_score: calcScore(next),
      })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else load();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">
            Track outbound emails and calls with engagement signals.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Log Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit" : "Log Communication"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v as CommType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sent</Label>
                  <Input
                    type="datetime-local"
                    value={form.sent_at}
                    onChange={(e) => setForm({ ...form, sent_at: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body / Notes</Label>
                <Textarea
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Select
                    value={form.company_id || "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, company_id: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact</Label>
                  <Select
                    value={form.contact_id || "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, contact_id: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {contacts
                        .filter(
                          (c) =>
                            !form.company_id || c.company_id === form.company_id,
                        )
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>{editing ? "Save" : "Log"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
            <MailOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.opened}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Replied</CardTitle>
            <Mail className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.replied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meetings Set</CardTitle>
            <CalendarCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.meetings}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
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
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No communications logged.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="inline-flex items-center gap-2">
                          {c.type === "Email" ? (
                            <Mail className="h-4 w-4" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                          <span>{c.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {c.subject ?? "—"}
                      </TableCell>
                      <TableCell>
                        {c.company_id ? companyMap[c.company_id] ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.contact_id ? contactMap[c.contact_id] ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.sent_at ? new Date(c.sent_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={c.opened_at ? "default" : "outline"}
                            className="h-7 px-2 text-xs"
                            onClick={() => markEvent(c, "opened_at")}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant={c.replied_at ? "default" : "outline"}
                            className="h-7 px-2 text-xs"
                            onClick={() => markEvent(c, "replied_at")}
                          >
                            Reply
                          </Button>
                          <Button
                            size="sm"
                            variant={c.meeting_scheduled_at ? "default" : "outline"}
                            className="h-7 px-2 text-xs"
                            onClick={() => markEvent(c, "meeting_scheduled_at")}
                          >
                            Mtg
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.engagement_score ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this communication?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/communications")({
  component: CommunicationsPage,
});

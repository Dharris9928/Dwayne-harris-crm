import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateInsight } from "@/lib/ai-insights.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Brain, Lightbulb, MessageSquareText, Loader2 } from "lucide-react";

const PRESETS = [
  {
    id: "pipeline",
    icon: Brain,
    title: "Pipeline Health Review",
    description: "Analyze open opportunities and recommend next steps.",
    builder: async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("name, stage, estimated_value, probability, expected_close_date");
      const ctx = (data ?? [])
        .slice(0, 50)
        .map(
          (o: any) =>
            `- ${o.name} | ${o.stage} | $${o.estimated_value ?? 0} | ${o.probability ?? 0}% | close: ${o.expected_close_date ?? "—"}`,
        )
        .join("\n");
      return {
        prompt:
          "Review this pipeline. Identify stalled deals, deals to push, and forecast risk. Give 3 prioritized actions.",
        context: ctx,
      };
    },
  },
  {
    id: "top-leads",
    icon: Sparkles,
    title: "Top Lead Recommendations",
    description: "Suggest which leads to call first this week.",
    builder: async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, industry, segment, priority_tier, lead_score, city, state")
        .eq("status", "Lead")
        .order("lead_score", { ascending: false })
        .limit(20);
      const ctx = (data ?? [])
        .map(
          (c: any) =>
            `- ${c.name} (${c.industry ?? "?"}, ${c.segment ?? "?"}) tier ${c.priority_tier ?? "—"} score ${c.lead_score ?? 0} — ${c.city ?? ""}, ${c.state ?? ""}`,
        )
        .join("\n");
      return {
        prompt:
          "From these leads, recommend the top 5 to contact this week. For each, suggest a one-line opening message.",
        context: ctx,
      };
    },
  },
  {
    id: "email",
    icon: MessageSquareText,
    title: "Draft Outreach Email",
    description: "Generate a personalized cold email template.",
    builder: async () => ({
      prompt:
        "Draft a 120-word cold email to a residential builder about a smart-home installation partnership. Include subject line, hook tied to new permit data, value prop, and a soft CTA.",
    }),
  },
  {
    id: "coach",
    icon: Lightbulb,
    title: "Sales Coaching Tips",
    description: "Get tactical advice for builder-segment selling.",
    builder: async () => ({
      prompt:
        "Give 5 tactical coaching tips for selling smart-home packages to production home builders. Include objection handlers.",
    }),
  },
];

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-base mt-3">{line.slice(4)}</h3>;
    if (line.startsWith("## ")) return <h2 key={i} className="font-bold text-lg mt-4">{line.slice(3)}</h2>;
    if (line.startsWith("# ")) return <h1 key={i} className="font-bold text-xl mt-4">{line.slice(2)}</h1>;
    if (line.match(/^\s*[-*]\s/))
      return <li key={i} className="ml-5 list-disc">{line.replace(/^\s*[-*]\s/, "")}</li>;
    if (line.match(/^\s*\d+\.\s/))
      return <li key={i} className="ml-5 list-decimal">{line.replace(/^\s*\d+\.\s/, "")}</li>;
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className="leading-relaxed">{line}</p>;
  });
}

function AIFeaturesPage() {
  const callAI = useServerFn(generateInsight);
  const [customPrompt, setCustomPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { prompt: string; context?: string }) =>
      callAI({ data: vars }),
    onSuccess: (res) => setOutput(res.content),
    onError: (err: any) => {
      const msg = String(err?.message ?? err);
      if (msg.includes("429")) toast.error("Rate limit reached. Try again in a moment.");
      else if (msg.includes("402")) toast.error("AI credits exhausted. Add credits in Lovable Cloud.");
      else toast.error(msg);
    },
  });

  async function runPreset(p: (typeof PRESETS)[number]) {
    setActivePreset(p.id);
    setOutput("");
    const built = await p.builder();
    mutation.mutate(built);
  }

  function runCustom() {
    if (!customPrompt.trim()) return;
    setActivePreset(null);
    setOutput("");
    mutation.mutate({ prompt: customPrompt });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-primary to-purple-500 p-2 text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Features</h1>
          <p className="text-muted-foreground">
            Pipeline insights, lead recommendations, and outreach drafts powered by Lovable AI.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <Card
              key={p.id}
              className="cursor-pointer transition hover:shadow-md hover:border-primary/40"
              onClick={() => runPreset(p)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.title}</CardTitle>
                      <CardDescription>{p.description}</CardDescription>
                    </div>
                  </div>
                  {activePreset === p.id && mutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ask Anything</CardTitle>
          <CardDescription>
            Free-form question. The AI sees this prompt only — add details for context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={3}
            placeholder="e.g. Summarize the strategy for closing builder-segment deals this quarter."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
          <Button onClick={runCustom} disabled={mutation.isPending || !customPrompt.trim()}>
            {mutation.isPending && !activePreset ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {(output || mutation.isPending) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Response</CardTitle>
              <Badge variant="secondary">gemini-2.5-flash</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {mutation.isPending ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating...
              </div>
            ) : (
              <div className="prose prose-sm max-w-none space-y-1">
                {renderMarkdown(output)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/ai-features")({
  component: AIFeaturesPage,
});

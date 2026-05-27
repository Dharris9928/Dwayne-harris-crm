import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InsightInput = z.object({
  prompt: z.string().min(1).max(2000),
  context: z.string().max(8000).optional(),
});

export const generateInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InsightInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const systemPrompt =
      "You are a sales analyst for a smart-home/builder CRM. Be concise, structured, and action-oriented. Use markdown bullet lists.";
    const userContent = data.context
      ? `${data.prompt}\n\nContext:\n${data.context}`
      : data.prompt;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error: ${res.status} ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";
    return { content };
  });

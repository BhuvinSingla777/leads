import OpenAI from "openai";

export type TenantSummary = {
  tenantId: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number; // 0..1
  avgQualityScore: number; // 0..1
  avgConversionProbability: number; // 0..1
  duplicatesCount: number;
  lowQualityCount: number;
  topSources: Array<{ source: string; leads: number; conversionRate: number }>;
  topCampaigns: Array<{ campaign: string; leads: number; conversionRate: number }>;
};

function buildHeuristicMarkdown(summary: TenantSummary): { title: string; content: string } {
  const conversionPct = (summary.conversionRate * 100).toFixed(1);
  const dupPct = summary.totalLeads ? ((summary.duplicatesCount / summary.totalLeads) * 100).toFixed(1) : "0";

  const topSourceText =
    summary.topSources.length > 0
      ? summary.topSources
          .slice(0, 3)
          .map((s, i) => `${i + 1}. ${s.source} (${(s.conversionRate * 100).toFixed(1)}% conversion)`)
          .join("\n")
      : "No source data detected in the ingested file.";

  const topCampaignText =
    summary.topCampaigns.length > 0
      ? summary.topCampaigns
          .slice(0, 3)
          .map((c, i) => `${i + 1}. ${c.campaign} (${(c.conversionRate * 100).toFixed(1)}% conversion)`)
          .join("\n")
      : "No campaign data detected in the ingested file.";

  return {
    title: "AI-style lead quality + conversion insights (heuristic)",
    content:
      `## Executive summary\n` +
      `- Conversion rate: **${conversionPct}%** (${summary.convertedLeads}/${summary.totalLeads} leads)\n` +
      `- Avg quality score: **${(summary.avgQualityScore * 100).toFixed(1)}**\n` +
      `- Avg predicted conversion probability: **${(summary.avgConversionProbability * 100).toFixed(1)}**\n` +
      `- Potential duplicate leads: **${summary.duplicatesCount}** (~${dupPct}% of leads)\n\n` +
      `## What’s working\n` +
      `### Top sources by conversion\n${topSourceText}\n\n` +
      `### Top campaigns by conversion\n${topCampaignText}\n\n` +
      `## Bottlenecks to fix first\n` +
      `- Low-quality leads: **${summary.lowQualityCount}**. Prioritize enrichment (email/phone validation), de-duping, and faster follow-up for high-probability leads.\n` +
      `- Duplicate handling: group duplicates by normalized email/phone/external id and route them to a single CRM record.\n\n` +
      `## Recommended next actions\n` +
      `1. Create a “contact & conversion” SLA for leads with predicted probability above ~0.6.\n` +
      `2. Re-check campaign/source mappings in your CSV (missing headers reduce scoring accuracy).\n` +
      `3. If you can provide historical outcome labels (converted/funded/revenue), we can replace heuristics with a trained model.\n`,
  };
}

export async function generateInsightsText(params: {
  openAiApiKey?: string;
  summary: TenantSummary;
}): Promise<{ title: string; content: string }> {
  const { openAiApiKey, summary } = params;

  // If no API key is configured, stay deterministic and still deliver value.
  if (!openAiApiKey) return buildHeuristicMarkdown(summary);

  const client = new OpenAI({ apiKey: openAiApiKey });

  const prompt =
    `You are a lead-gen analytics assistant. Create actionable insights for this tenant based on the summary metrics.\n\n` +
    `Return a concise markdown answer with these sections:\n` +
    `1) Executive summary (3-5 bullets)\n` +
    `2) What’s working (top 2-3 sources and campaigns)\n` +
    `3) Bottlenecks (2-3 items)\n` +
    `4) Recommended next actions (3 steps)\n\n` +
    `Tenant summary JSON:\n` +
    JSON.stringify(summary, null, 2);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: "You generate high-signal analytics insights. Avoid fluff." },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim() || buildHeuristicMarkdown(summary).content;
  return {
    title: "AI-generated lead analytics insights",
    content,
  };
}


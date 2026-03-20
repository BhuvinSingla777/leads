import { prisma } from "@/lib/prisma";
import { generateInsightsText, type TenantSummary } from "@/lib/insights/generateInsights";

function isConverted(input: { outcomeStatus?: string | null; revenue?: number | null }) {
  const outcome = (input.outcomeStatus ?? "").toLowerCase();
  const hasRevenue = typeof input.revenue === "number" && input.revenue > 0;
  if (hasRevenue) return true;
  return ["funded", "converted", "paid", "won", "revenue", "application"].some((k) => outcome.includes(k));
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const limit = 2000;

  const totalLeads = await prisma.lead.count({ where: { tenantId } });

  const leads = await prisma.lead.findMany({
    where: { tenantId },
    take: limit,
    orderBy: { createdAtDb: "desc" },
    select: {
      source: true,
      campaign: true,
      outcomeStatus: true,
      revenue: true,
      qualityScore: true,
      conversionProbability: true,
      duplicateGroupKey: true,
    },
  });

  const convertedLeads = leads.filter((l) => isConverted(l)).length;
  const conversionRate = leads.length ? convertedLeads / leads.length : 0;

  const qualityScores = leads.map((l) => l.qualityScore).filter((v): v is number => typeof v === "number");
  const avgQualityScore = qualityScores.length ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;

  const conversionProbs = leads
    .map((l) => l.conversionProbability)
    .filter((v): v is number => typeof v === "number");
  const avgConversionProbability = conversionProbs.length
    ? conversionProbs.reduce((a, b) => a + b, 0) / conversionProbs.length
    : 0;

  const duplicatesCount = leads.filter((l) => !!l.duplicateGroupKey).length;
  const lowQualityCount = leads.filter((l) => typeof l.qualityScore === "number" && l.qualityScore < 0.3).length;

  const bySource = new Map<string, { leads: number; converted: number }>();
  const byCampaign = new Map<string, { leads: number; converted: number }>();

  for (const l of leads) {
    const sourceKey = l.source || "Unknown";
    const campKey = l.campaign || "Unknown";
    const converted = isConverted(l);

    const s = bySource.get(sourceKey) ?? { leads: 0, converted: 0 };
    s.leads += 1;
    if (converted) s.converted += 1;
    bySource.set(sourceKey, s);

    const c = byCampaign.get(campKey) ?? { leads: 0, converted: 0 };
    c.leads += 1;
    if (converted) c.converted += 1;
    byCampaign.set(campKey, c);
  }

  const topSources = Array.from(bySource.entries())
    .map(([source, v]) => ({
      source,
      leads: v.leads,
      conversionRate: v.leads ? v.converted / v.leads : 0,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);

  const topCampaigns = Array.from(byCampaign.entries())
    .map(([campaign, v]) => ({
      campaign,
      leads: v.leads,
      conversionRate: v.leads ? v.converted / v.leads : 0,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);

  const summary: TenantSummary = {
    tenantId,
    totalLeads,
    convertedLeads,
    conversionRate,
    avgQualityScore,
    avgConversionProbability,
    duplicatesCount,
    lowQualityCount,
    topSources,
    topCampaigns,
  };

  const latestRun = await prisma.ingestionRun.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const openAiApiKey = process.env.OPENAI_API_KEY;

  const { title, content } = await generateInsightsText({
    openAiApiKey,
    summary,
  });

  await prisma.aIInsight.create({
    data: {
      tenantId,
      ingestionRunId: latestRun?.id,
      type: "lead_analytics",
      title,
      content,
    },
  });

  return Response.json({ ok: true });
}


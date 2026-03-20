import Link from "next/link";
import { prisma } from "@/lib/prisma";

function isConverted(input: { outcomeStatus?: string | null; revenue?: number | null }) {
  const outcome = (input.outcomeStatus ?? "").toLowerCase();
  const hasRevenue = typeof input.revenue === "number" && input.revenue > 0;
  if (hasRevenue) return true;
  return ["funded", "converted", "paid", "won", "revenue", "application"].some((k) => outcome.includes(k));
}

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return <div className="py-10 text-red-700">Tenant not found.</div>;

  const limit = 2000;
  const leads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
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

  const totalLeads = await prisma.lead.count({ where: { tenantId: tenant.id } });

  const convertedLeads = leads.filter((l) => isConverted(l)).length;
  const conversionRate = leads.length ? convertedLeads / leads.length : 0;

  const qualityScores = leads.map((l) => l.qualityScore).filter((v): v is number => typeof v === "number");
  const avgQualityScore = qualityScores.length ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;

  const conversionProbs = leads.map((l) => l.conversionProbability).filter((v): v is number => typeof v === "number");
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

  const recentLeads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    take: 10,
    orderBy: { createdAtDb: "desc" },
    select: {
      id: true,
      email: true,
      phone: true,
      externalId: true,
      source: true,
      campaign: true,
      leadStatus: true,
      outcomeStatus: true,
      qualityScore: true,
      conversionProbability: true,
      createdAtFromCsv: true,
      createdAtDb: true,
    },
  });

  return (
    <div>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-4 shadow-sm">
          <div className="text-xs text-indigo-700/80">Total leads</div>
          <div className="mt-1 text-lg font-semibold text-indigo-950">{totalLeads}</div>
          <div className="mt-2 text-xs text-indigo-700/70">Window: latest {Math.min(limit, leads.length)}</div>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-4 shadow-sm">
          <div className="text-xs text-indigo-700/80">Conversion rate</div>
          <div className="mt-1 text-lg font-semibold text-indigo-950">{(conversionRate * 100).toFixed(1)}%</div>
          <div className="mt-2 text-xs text-indigo-700/70">
            {convertedLeads}/{leads.length} (in-window)
          </div>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-4 shadow-sm">
          <div className="text-xs text-indigo-700/80">Avg quality score</div>
          <div className="mt-1 text-lg font-semibold text-indigo-950">{(avgQualityScore * 100).toFixed(1)}</div>
          <div className="mt-2 text-xs text-indigo-700/70">0..100 heuristic</div>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-4 shadow-sm">
          <div className="text-xs text-indigo-700/80">Duplicates (batch)</div>
          <div className="mt-1 text-lg font-semibold text-indigo-950">{duplicatesCount}</div>
          <div className="mt-2 text-xs text-indigo-700/70">
            Avg predicted conv: {(avgConversionProbability * 100).toFixed(1)}% (heuristic)
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/60 to-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-indigo-950">Top sources</div>
          <div className="mt-3 space-y-2">
            {topSources.length === 0 ? (
              <div className="text-sm text-indigo-700/70">No data yet. Upload a CSV.</div>
            ) : (
              topSources.map((s) => (
                <div key={s.source} className="flex items-center justify-between gap-3 text-sm">
                  <div className="truncate">{s.source}</div>
                  <div className="whitespace-nowrap text-indigo-900/70">
                    {s.leads} leads • {(s.conversionRate * 100).toFixed(1)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/60 to-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-indigo-950">Top campaigns</div>
          <div className="mt-3 space-y-2">
            {topCampaigns.length === 0 ? (
              <div className="text-sm text-indigo-700/70">No data yet. Upload a CSV.</div>
            ) : (
              topCampaigns.map((c) => (
                <div key={c.campaign} className="flex items-center justify-between gap-3 text-sm">
                  <div className="truncate">{c.campaign}</div>
                  <div className="whitespace-nowrap text-indigo-900/70">
                    {c.leads} leads • {(c.conversionRate * 100).toFixed(1)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/60 to-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-indigo-950">Recent leads (preview)</div>
            <div className="mt-1 text-xs text-indigo-700/70">
              Showing latest 10 leads. Low-quality leads in-window: {lowQualityCount}
            </div>
          </div>
          <Link
            href={`/dashboard/${tenant.id}/upload`}
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 underline decoration-indigo-200 hover:decoration-indigo-400 underline-offset-4"
          >
            Upload another file
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-indigo-700/70">
              <tr>
                <th className="px-2 py-2">Lead</th>
                <th className="px-2 py-2">Source</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Quality</th>
                <th className="px-2 py-2">Pred. Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100">
              {recentLeads.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-sm text-indigo-700/70" colSpan={5}>
                    No leads yet. Upload a CSV to start.
                  </td>
                </tr>
              ) : (
                recentLeads.map((l) => (
                  <tr key={l.id}>
                    <td className="px-2 py-2">
                      <div className="font-medium text-indigo-950">{l.email || l.phone || l.externalId || "Unknown"}</div>
                      <div className="text-xs text-indigo-700/60">
                        {l.createdAtFromCsv ? l.createdAtFromCsv.toISOString().slice(0, 10) : ""}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="truncate">{l.source || "Unknown"}</div>
                      <div className="text-xs text-indigo-700/60 truncate">{l.campaign || ""}</div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="truncate">{l.leadStatus || "—"}</div>
                      <div className="text-xs text-indigo-700/60 truncate">{l.outcomeStatus || ""}</div>
                    </td>
                    <td className="px-2 py-2">{typeof l.qualityScore === "number" ? (l.qualityScore * 100).toFixed(1) : "—"}</td>
                    <td className="px-2 py-2">
                      {typeof l.conversionProbability === "number" ? `${(l.conversionProbability * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


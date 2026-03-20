import { prisma } from "@/lib/prisma";
import GenerateInsightsButton from "./generate-insights-button";

export const dynamic = "force-dynamic";

export default async function TenantInsightsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return <div className="py-10 text-red-700">Tenant not found.</div>;

  const insights = await prisma.aIInsight.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, type: true, title: true, content: true, createdAt: true },
  });

  return (
    <div>
      <div className="mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/60 to-white p-5 shadow-sm">
        <GenerateInsightsButton tenantId={tenant.id} />
      </div>

      <div className="mt-5 space-y-4">
        {insights.length === 0 ? (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-800/90">
            No insights generated yet. Click “Generate Insights” to create the first analysis.
          </div>
        ) : (
          insights.map((i) => (
            <section
              key={i.id}
              className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-indigo-950">{i.title}</div>
                  <div className="mt-1 text-xs text-indigo-700/70">
                    {new Date(i.createdAt).toLocaleString()} • type: {i.type}
                  </div>
                </div>
              </div>
              <pre className="mt-4 whitespace-pre-wrap text-sm text-indigo-950/90 font-mono overflow-x-auto">
                {i.content}
              </pre>
            </section>
          ))
        )}
      </div>
    </div>
  );
}


import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  let tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });

  if (tenants.length === 0) {
    await prisma.tenant.createMany({
      data: [
        { name: "Acme Marketing (Demo)" },
        { name: "Globex Lead Ops (Demo)" },
      ],
    });
    tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-indigo-950">Tenants</h1>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {tenants.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/${t.id}`}
            className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-5 shadow-sm hover:from-indigo-50 hover:to-indigo-50/20"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-indigo-950">{t.name}</div>
              <div className="text-xs text-indigo-700/80">Tenant</div>
            </div>
            <div className="mt-3 text-xs text-indigo-800/70 break-all font-mono">id: {t.id}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}


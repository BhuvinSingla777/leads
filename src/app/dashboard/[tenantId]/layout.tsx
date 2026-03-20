import type { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SidebarNav from "./_components/SidebarNav";

export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 bg-gradient-to-b from-[#071a3a] to-[#0b2a6f] text-slate-100">
          <div className="px-5 py-5">
            <div className="text-lg font-semibold tracking-tight">
              Leads <span className="text-indigo-200">AI</span>
            </div>
            <div className="mt-1 text-xs text-slate-300">SaaS analytics prototype</div>
          </div>

          <div className="border-t border-white/10" />

          <SidebarNav tenantId={tenantId} />

          <div className="px-5 py-4 border-t border-white/10">
            <div className="text-xs text-slate-300">Workspace</div>
            <div className="mt-1 text-sm font-medium truncate">
              {tenant?.name ?? "Unknown tenant"}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-indigo-200">
            <div className="mx-auto w-full max-w-6xl px-6 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-slate-600">Overview</div>
                <div className="text-xl font-semibold text-indigo-950">Lead Quality & Conversion</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs text-slate-600">Date range</span>
                  <select className="text-sm outline-none bg-transparent text-slate-900">
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                    <option>All time</option>
                  </select>
                </div>

                <Link
                  href="/"
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-100"
                >
                  Home
                </Link>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-6 py-6">{children}</main>
        </section>
      </div>
    </div>
  );
}


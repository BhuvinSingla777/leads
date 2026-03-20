import { prisma } from "@/lib/prisma";
import UploadCsvForm from "./upload-csv-form";

export const dynamic = "force-dynamic";

export default async function UploadCsvPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return <div className="py-10 text-red-700">Tenant not found.</div>;

  return (
    <div>
      <div className="mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/60 to-white p-5 shadow-sm">
        <UploadCsvForm tenantId={tenant.id} />
      </div>

      <div className="mt-4 text-xs text-indigo-700/70">
        Column mapping is heuristic-based (e.g. headers containing <code>email</code>, <code>phone</code>, <code>source</code>,{" "}
        <code>campaign</code>, <code>lead status</code>, <code>outcome</code> / <code>revenue</code>).
      </div>
    </div>
  );
}


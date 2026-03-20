import { prisma } from "@/lib/prisma";

export async function GET() {
  let tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });

  // Seed a couple of demo tenants for the initial prototype.
  if (tenants.length === 0) {
    await prisma.tenant.createMany({
      data: [
        { name: "Acme Marketing (Demo)" },
        { name: "Globex Lead Ops (Demo)" },
      ],
    });
    tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
  }

  return Response.json({ tenants });
}


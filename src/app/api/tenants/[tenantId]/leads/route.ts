import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const limit = 50;

  const leads = await prisma.lead.findMany({
    where: { tenantId },
    take: limit,
    orderBy: { createdAtDb: "desc" },
    select: {
      id: true,
      externalId: true,
      email: true,
      phone: true,
      source: true,
      campaign: true,
      leadStatus: true,
      outcomeStatus: true,
      cost: true,
      revenue: true,
      qualityScore: true,
      conversionProbability: true,
      duplicateGroupKey: true,
      createdAtFromCsv: true,
      createdAtDb: true,
    },
  });

  return Response.json({ tenantId, leads });
}


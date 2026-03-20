import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const insights = await prisma.aIInsight.findMany({
    where: { tenantId: (await context.params).tenantId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      createdAt: true,
    },
  });

  return Response.json({ tenantId: (await context.params).tenantId, insights });
}


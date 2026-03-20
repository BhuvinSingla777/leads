import { PrismaClient } from "@/generated/prisma/client";

// Prevent hot-reload from creating new Prisma clients in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Keep default logging quiet; enable logs when debugging ingestion.
    log: [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}


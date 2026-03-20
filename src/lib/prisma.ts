// Use a relative import to avoid Turbopack alias-resolution issues.
import { PrismaClient } from "../generated/prisma/client";

// Prisma requires DATABASE_URL at runtime.
// On some CI/CD platforms, env vars may not be present during boot, so we fall back
// to the local sqlite DB included in the repo (dev/demo).
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

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


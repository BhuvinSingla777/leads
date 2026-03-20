-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "fileName" TEXT,
    "rowsProcessed" INTEGER NOT NULL DEFAULT 0,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "rowsErrored" INTEGER NOT NULL DEFAULT 0,
    "schemaGuess" JSONB,
    "error" TEXT,
    CONSTRAINT "IngestionRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "externalId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "source" TEXT,
    "campaign" TEXT,
    "leadStatus" TEXT,
    "outcomeStatus" TEXT,
    "cost" REAL,
    "revenue" REAL,
    "createdAtFromCsv" DATETIME,
    "qualityScore" REAL,
    "conversionProbability" REAL,
    "fingerprint" TEXT,
    "duplicateGroupKey" TEXT,
    "features" JSONB,
    "raw" JSONB,
    "createdAtDb" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIInsight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIInsight_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IngestionRun_tenantId_createdAt_idx" ON "IngestionRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_tenantId_fingerprint_idx" ON "Lead"("tenantId", "fingerprint");

-- CreateIndex
CREATE INDEX "Lead_tenantId_externalId_idx" ON "Lead"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_source_idx" ON "Lead"("tenantId", "source");

-- CreateIndex
CREATE INDEX "Lead_tenantId_campaign_idx" ON "Lead"("tenantId", "campaign");

-- CreateIndex
CREATE INDEX "AIInsight_tenantId_type_idx" ON "AIInsight"("tenantId", "type");

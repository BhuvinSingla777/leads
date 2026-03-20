import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";
import { computeFingerprint, scoreLead } from "@/lib/lead/scoreLead";

export type IngestCsvResult = {
  ingestionRunId: string;
  rowsProcessed: number;
  rowsInserted: number;
  rowsErrored: number;
  schemaGuess: {
    headers: string[];
  };
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function pickByHeader(row: Record<string, string>, headerRegexes: RegExp[]): string | undefined {
  for (const [key, value] of Object.entries(row)) {
    const h = normalizeHeader(key);
    if (headerRegexes.some((r) => r.test(h))) {
      const v = String(value ?? "").trim();
      if (v) return v;
    }
  }
  return undefined;
}

function parseMaybeDate(input: string | undefined): Date | undefined {
  if (!input) return undefined;
  const s = String(input).trim();
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function mapRowToLeadCandidate(row: Record<string, string>) {
  const email = pickByHeader(row, [/email/, /e-mail/, /mail/]);
  const phone = pickByHeader(row, [/phone/, /mobile/, /tel/, /msisdn/]);
  const name = pickByHeader(row, [/^name$/, /full.?name/, /contact.?name/]);
  const externalId = pickByHeader(row, [
    /lead.?id/,
    /external.?id/,
    /^id$/,
    /lead[_ -]?identifier/,
  ]);
  const source = pickByHeader(row, [/source/, /vendor/, /channel/, /lead.?source/]);
  const campaign = pickByHeader(row, [/campaign/, /ad.?campaign/, /utm[_ -]?campaign/]);
  const leadStatus = pickByHeader(row, [/lead.?status/, /status/, /funnel.?stage/]);
  const outcomeStatus = pickByHeader(row, [
    /outcome/,
    /conversion/,
    /converted/,
    /funded/,
    /won/,
    /revenue.?status/,
  ]);
  const cost = pickByHeader(row, [/cost/, /spend/, /cpc/, /cpm/, /amount.?spent/]);
  const revenue = pickByHeader(row, [/revenue/, /amount/, /funded.?amount/, /paid/]);
  const createdAt = pickByHeader(row, [/created/, /date/, /timestamp/, /lead.?date/]);

  const score = scoreLead({
    externalId,
    email,
    phone,
    source,
    campaign,
    leadStatus,
    outcomeStatus,
    revenue,
  });

  const fingerprint = score.fingerprint ?? computeFingerprint({ externalId, email, phone });

  return {
    externalId,
    email,
    phone,
    name,
    source,
    campaign,
    leadStatus,
    outcomeStatus,
    cost: cost ? Number(String(cost).replace(/[^0-9.\-]/g, "")) : undefined,
    revenue: revenue ? Number(String(revenue).replace(/[^0-9.\-]/g, "")) : undefined,
    createdAtFromCsv: parseMaybeDate(createdAt),
    qualityScore: score.qualityScore,
    conversionProbability: score.conversionProbability,
    fingerprint,
    features: {
      qualityScore: score.qualityScore,
      conversionProbability: score.conversionProbability,
    },
    raw: row,
  };
}

export async function ingestLeadCsv(params: { tenantId: string; csvText: string; fileName?: string }) {
  const { tenantId, csvText, fileName } = params;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Create an ingestion run row early so the UI can show progress.
  const ingestionRun = await prisma.ingestionRun.create({
    data: {
      tenantId,
      startedAt: new Date(),
      fileName,
    },
  });

  try {
    // csv-parse expects sane input; BOM can break headers.
    const cleaned = csvText.replace(/^\uFEFF/, "");

    const records = parse(cleaned, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Array<Record<string, string>>;

    if (!records.length) {
      await prisma.ingestionRun.update({
        where: { id: ingestionRun.id },
        data: {
          finishedAt: new Date(),
          rowsProcessed: 0,
          rowsInserted: 0,
          rowsErrored: 0,
          schemaGuess: { headers: [] },
        },
      });
      return {
        ingestionRunId: ingestionRun.id,
        rowsProcessed: 0,
        rowsInserted: 0,
        rowsErrored: 0,
        schemaGuess: { headers: [] },
      } satisfies IngestCsvResult;
    }

    const headers = Object.keys(records[0] ?? {});
    const rowsProcessed = records.length;

    const mapped: Array<{
      externalId?: string;
      email?: string;
      phone?: string;
      name?: string;
      source?: string;
      campaign?: string;
      leadStatus?: string;
      outcomeStatus?: string;
      cost?: number;
      revenue?: number;
      createdAtFromCsv?: Date;
      qualityScore: number;
      conversionProbability: number;
      fingerprint?: string;
      features: { qualityScore: number; conversionProbability: number };
      raw: Record<string, string>;
    }> = [];

    let rowsErrored = 0;

    for (const row of records) {
      try {
        mapped.push(mapRowToLeadCandidate(row as Record<string, string>));
      } catch {
        rowsErrored += 1;
      }
    }

    // Duplicate detection within this batch: fingerprint -> count.
    const counts = new Map<string, number>();
    for (const m of mapped) {
      if (!m.fingerprint) continue;
      counts.set(m.fingerprint, (counts.get(m.fingerprint) ?? 0) + 1);
    }

    const createData = mapped.map((m) => {
      const duplicateGroupKey = m.fingerprint && (counts.get(m.fingerprint) ?? 0) > 1 ? m.fingerprint : null;

      return {
        tenantId,
        ingestionRunId: ingestionRun.id,
        externalId: m.externalId || null,
        email: m.email || null,
        phone: m.phone || null,
        name: m.name || null,
        source: m.source || null,
        campaign: m.campaign || null,
        leadStatus: m.leadStatus || null,
        outcomeStatus: m.outcomeStatus || null,
        cost: m.cost ?? null,
        revenue: m.revenue ?? null,
        createdAtFromCsv: m.createdAtFromCsv ?? null,
        qualityScore: m.qualityScore,
        conversionProbability: m.conversionProbability,
        fingerprint: m.fingerprint ?? null,
        duplicateGroupKey,
        features: m.features,
        raw: m.raw,
      };
    });

    const inserted = createData.length;
    await prisma.lead.createMany({ data: createData });

    await prisma.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        finishedAt: new Date(),
        rowsProcessed,
        rowsInserted: inserted,
        rowsErrored,
        schemaGuess: { headers },
      },
    });

    return {
      ingestionRunId: ingestionRun.id,
      rowsProcessed,
      rowsInserted: inserted,
      rowsErrored,
      schemaGuess: { headers },
    } satisfies IngestCsvResult;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        finishedAt: new Date(),
        error: message,
      },
    });
    throw e;
  }
}


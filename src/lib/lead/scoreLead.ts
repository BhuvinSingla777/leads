import { isValidEmail, normalizePhone, normalizeString } from "@/lib/lead/normalize";

export type LeadDerived = {
  qualityScore: number;
  conversionProbability: number;
  fingerprint?: string;
};

function includesAny(haystack: string | undefined, needles: string[]): boolean {
  if (!haystack) return false;
  const s = haystack.toLowerCase();
  return needles.some((n) => s.includes(n));
}

export function computeFingerprint(input: {
  externalId?: unknown;
  email?: unknown;
  phone?: unknown;
}): string | undefined {
  const email = normalizeString(input.email);
  if (email && isValidEmail(email)) return `email:${email.toLowerCase()}`;

  const phone = normalizePhone(input.phone);
  if (phone) return `phone:${phone}`;

  const externalId = normalizeString(input.externalId);
  if (externalId) return `ext:${externalId.toLowerCase()}`;

  return undefined;
}

export function scoreLead(input: {
  externalId?: unknown;
  email?: unknown;
  phone?: unknown;
  source?: unknown;
  campaign?: unknown;
  leadStatus?: unknown;
  outcomeStatus?: unknown;
  revenue?: unknown;
}): LeadDerived {
  const email = normalizeString(input.email);
  const phone = normalizePhone(input.phone);
  const source = normalizeString(input.source);
  const campaign = normalizeString(input.campaign);
  const leadStatus = normalizeString(input.leadStatus);
  const outcomeStatus = normalizeString(input.outcomeStatus);

  const revenueNum =
    typeof input.revenue === "number"
      ? input.revenue
      : input.revenue
        ? Number(String(input.revenue).replace(/[^0-9.\-]/g, ""))
        : undefined;

  const hasRevenue = typeof revenueNum === "number" && Number.isFinite(revenueNum) && revenueNum > 0;

  const emailScore = email ? (isValidEmail(email) ? 0.3 : 0.15) : 0;
  const phoneScore = phone ? 0.25 : 0;
  const sourceScore = source ? 0.15 : 0;
  const campaignScore = campaign ? 0.1 : 0;
  const statusScore = leadStatus ? 0.1 : 0;

  const outcomePositive =
    includesAny(outcomeStatus, ["funded", "converted", "paid", "revenue", "won", "application"]) ||
    hasRevenue;
  const outcomeNegative = includesAny(outcomeStatus, ["rejected", "lost", "n/a", "invalid"]);

  const outcomeScore = outcomePositive ? 0.25 : outcomeNegative ? -0.1 : 0;

  let qualityScore = emailScore + phoneScore + sourceScore + campaignScore + statusScore + outcomeScore;
  qualityScore = Math.max(0, Math.min(1, qualityScore));

  let conversionProbability = 0.15 + 0.75 * qualityScore;

  if (outcomeNegative) conversionProbability = Math.min(conversionProbability, 0.08);
  if (hasRevenue) conversionProbability = Math.max(conversionProbability, 0.9);
  if (outcomePositive && !hasRevenue) conversionProbability = Math.max(conversionProbability, 0.72);

  // If status signals “in progress”, nudge up.
  if (
    includesAny(leadStatus, ["contacted", "applied", "application", "qualified", "follow up"]) &&
    !outcomePositive
  ) {
    conversionProbability = Math.max(conversionProbability, 0.45);
  }

  conversionProbability = Math.max(0, Math.min(1, conversionProbability));

  const fingerprint = computeFingerprint({
    externalId: input.externalId,
    email: input.email,
    phone: input.phone,
  });

  return {
    qualityScore,
    conversionProbability,
    fingerprint,
  };
}


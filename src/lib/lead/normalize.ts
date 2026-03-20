export function normalizeString(input: unknown): string | undefined {
  if (input === null || input === undefined) return undefined;
  const s = String(input).trim();
  if (!s) return undefined;
  return s;
}

export function normalizeEmail(input: unknown): string | undefined {
  const s = normalizeString(input);
  if (!s) return undefined;
  return s.toLowerCase();
}

export function isValidEmail(email: string): boolean {
  // Pragmatic validation; not RFC-perfect.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizePhone(input: unknown): string | undefined {
  const s = normalizeString(input);
  if (!s) return undefined;
  const digits = s.replace(/\D+/g, "");
  if (digits.length < 10) return undefined;
  return digits;
}


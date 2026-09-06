// Normalizes phone numbers to standard E.164 Ghana format (+233...)
export function normalizePhone(value: string): string {
  const fallback = (value || "").trim();
  if (!fallback) return "";
  
  const digitsOnly = fallback.replace(/\D/g, "");
  if (!digitsOnly) return "";
  
  if (digitsOnly.startsWith("233")) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
    return `+233${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.length === 9) {
    return `+233${digitsOnly}`;
  }
  
  return fallback.startsWith("+") ? fallback : `+${digitsOnly}`;
}

export function isValidGhanaPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  return /^\+233\d{9}$/.test(normalized);
}

export function normalizeAdminPhone(value: string): string {
  return value.replace(/\s+/g, "").replace(/[()\-]/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const digitsA = (a || "").replace(/\D/g, "");
  const digitsB = (b || "").replace(/\D/g, "");
  if (!digitsA || !digitsB) return false;
  if (digitsA === digitsB) return true;
  return digitsA.slice(-9) === digitsB.slice(-9);
}

// Normalizes phone numbers for Arkesel SMS API (digits only, e.g., 233558379545)
export function formatArkeselPhone(value: string): string {
  const normalized = normalizePhone(value);
  if (!normalized) return "";
  return normalized.replace(/^\+/, "");
}

// Normalizes and deduplicates a list of phone numbers for bulk Arkesel dispatch
export function formatArkeselPhoneList(phones: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const raw of phones) {
    if (!raw) continue;
    const formatted = formatArkeselPhone(raw);
    if (formatted && formatted.length >= 10 && !seen.has(formatted)) {
      seen.add(formatted);
      results.push(formatted);
    }
  }

  return results;
}

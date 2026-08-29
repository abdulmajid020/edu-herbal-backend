/**
 * Normalizes phone numbers to standard E.164 Ghana format (+233...)
 */
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

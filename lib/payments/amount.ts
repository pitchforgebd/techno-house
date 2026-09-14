/**
 * Parse gateway amount strings into integer taka.
 * Fractional taka is rejected — order totals are whole taka.
 */
export function parseTakaAmount(raw: unknown): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) {
      return null;
    }
    if (Math.abs(raw - Math.round(raw)) > 0.001) {
      return null;
    }
    return Math.round(raw);
  }
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  if (Math.abs(value - Math.round(value)) > 0.001) {
    return null;
  }
  return Math.round(value);
}

/** UTC flash-sale date helpers shared by persist and admin forms. */

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatFlashDateTime(value: Date): string {
  return `${pad2(value.getUTCDate())}-${pad2(value.getUTCMonth() + 1)}-${value.getUTCFullYear()} ${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(value.getUTCSeconds())}`;
}

export function toFlashDateTimeLocal(value: Date): string {
  return value.toISOString().slice(0, 16);
}

export function parseFlashDateTime(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const dmy =
    /^(\d{2})-(\d{2})-(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      trimmed,
    );
  if (dmy) {
    const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = dmy;
    const parsed = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    const parsed = new Date(`${trimmed.slice(0, 16)}:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

import { MOCK_ADMIN_WARRANTIES } from "@/lib/admin/warranties-mock";

export type ProductWarrantyOption = {
  id: string;
  text: string;
  badge: string;
};

/** Short logo text for the circular warranty mark (Admin + storefront). */
export function warrantyBadgeFromLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "W";
  }
  if (/lifetime/i.test(trimmed)) {
    return "LT";
  }
  const years = /(\d+)\s*y(?:ear)?/i.exec(trimmed);
  if (years?.[1]) {
    return `${years[1]}Y`;
  }
  const months = /(\d+)\s*m(?:onth)?/i.exec(trimmed);
  if (months?.[1]) {
    return `${months[1]}M`;
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function listProductWarrantyOptions(): ProductWarrantyOption[] {
  return MOCK_ADMIN_WARRANTIES.map((item) => ({
    id: item.id,
    text: item.text,
    badge: item.badge,
  }));
}

/** Map a stored product label back to a preset id when possible. */
export function matchWarrantyOptionId(
  label: string | null | undefined,
  options: ProductWarrantyOption[],
): string {
  if (!label?.trim() || options.length === 0) {
    return "";
  }
  const needle = label.trim().toLowerCase();
  const exact = options.find((item) => item.text.toLowerCase() === needle);
  if (exact) {
    return exact.id;
  }
  const contained = options.find(
    (item) =>
      needle.includes(item.text.toLowerCase()) ||
      item.text.toLowerCase().includes(needle),
  );
  if (contained) {
    return contained.id;
  }
  const fromBadge = warrantyBadgeFromLabel(label);
  const byBadge = options.find(
    (item) => item.badge.toLowerCase() === fromBadge.toLowerCase(),
  );
  return byBadge?.id ?? "";
}

/**
 * Attribute create/edit input helpers (P12-T03).
 * Safe to import from Client Components — no Prisma.
 */

export const ATTRIBUTE_NAME_MAX = 120;
export const ATTRIBUTE_KEY_MAX = 80;
export const ATTRIBUTE_VALUE_MAX = 80;
export const ATTRIBUTE_VALUE_COUNT_MAX = 80;
export const ATTRIBUTE_POSITION_MAX = 99_999;

export function slugifyAttributeKey(value: string): string {
  const trimmed = value.trim();
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmed)) {
    return trimmed.slice(0, ATTRIBUTE_KEY_MAX);
  }
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ATTRIBUTE_KEY_MAX);
}

export function parseAttributeValues(values: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of values) {
    const value = raw.trim().slice(0, ATTRIBUTE_VALUE_MAX);
    if (!value || seen.has(value.toLowerCase())) {
      continue;
    }
    seen.add(value.toLowerCase());
    cleaned.push(value);
    if (cleaned.length >= ATTRIBUTE_VALUE_COUNT_MAX) {
      break;
    }
  }
  return cleaned;
}

function parsePosition(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (parsed > ATTRIBUTE_POSITION_MAX) {
    return null;
  }
  return parsed;
}

export type AttributeInputFields = {
  name: string;
  key: string;
  values: string[];
  isFilterable: boolean;
  position: string;
};

export type ParsedAttributeInput = {
  name: string;
  key: string;
  values: string[];
  isFilterable: boolean;
  position: number;
};

export function parseAttributeInput(
  input: AttributeInputFields,
):
  { ok: true; value: ParsedAttributeInput } | { ok: false; formError: string } {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, formError: "Enter an attribute name." };
  }
  if (name.length > ATTRIBUTE_NAME_MAX) {
    return { ok: false, formError: "Attribute name is too long." };
  }

  const key = slugifyAttributeKey(input.key || name);
  if (!key) {
    return { ok: false, formError: "Enter an attribute key." };
  }

  const values = parseAttributeValues(input.values);
  if (values.length === 0) {
    return { ok: false, formError: "Add at least one attribute value." };
  }

  const position = parsePosition(input.position);
  if (position === null) {
    return {
      ok: false,
      formError: "Ordering number must be a whole number.",
    };
  }

  return {
    ok: true,
    value: {
      name,
      key,
      values,
      isFilterable: input.isFilterable,
      position,
    },
  };
}

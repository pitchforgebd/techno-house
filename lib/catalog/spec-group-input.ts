/**
 * Product specification group helpers (client-safe).
 */

export const SPEC_GROUP_MAX = 24;
export const SPEC_ROW_PER_GROUP_MAX = 40;
export const SPEC_TITLE_MAX = 80;
export const SPEC_LABEL_MAX = 120;
export const SPEC_VALUE_MAX = 2_000;
export const SPEC_CHIP_SYNC_MAX = 8;

export type SpecGroupInputFields = {
  title: string;
  rows: Array<{ key: string; value: string }>;
};

export type ParsedSpecGroup = {
  title: string;
  rows: Array<{ key: string; value: string }>;
};

export function parseSpecGroups(
  groups: SpecGroupInputFields[],
):
  | { ok: true; value: ParsedSpecGroup[] }
  | { ok: false; formError: string } {
  if (groups.length > SPEC_GROUP_MAX) {
    return {
      ok: false,
      formError: `A product can have at most ${SPEC_GROUP_MAX} specification groups.`,
    };
  }

  const parsed: ParsedSpecGroup[] = [];
  const seenTitles = new Set<string>();

  for (const group of groups) {
    const title = group.title.trim().slice(0, SPEC_TITLE_MAX);
    const rowsRaw = group.rows ?? [];

    const rows: Array<{ key: string; value: string }> = [];
    for (const row of rowsRaw) {
      const key = row.key.trim().slice(0, SPEC_LABEL_MAX);
      const value = row.value.trim().slice(0, SPEC_VALUE_MAX);
      if (!key && !value) {
        continue;
      }
      if (!key || !value) {
        return {
          ok: false,
          formError: title
            ? `Each row in “${title}” needs both a label and a value.`
            : "Each specification row needs both a label and a value.",
        };
      }
      rows.push({ key, value });
    }

    if (!title && rows.length === 0) {
      continue;
    }
    if (!title) {
      return {
        ok: false,
        formError: "Each specification group needs a section title.",
      };
    }
    if (rows.length === 0) {
      return {
        ok: false,
        formError: `Add at least one row under “${title}”, or remove that section.`,
      };
    }
    if (rows.length > SPEC_ROW_PER_GROUP_MAX) {
      return {
        ok: false,
        formError: `“${title}” can have at most ${SPEC_ROW_PER_GROUP_MAX} rows.`,
      };
    }

    const titleKey = title.toLowerCase();
    if (seenTitles.has(titleKey)) {
      return {
        ok: false,
        formError: `Specification section “${title}” is listed more than once.`,
      };
    }
    seenTitles.add(titleKey);
    parsed.push({ title, rows });
  }

  return { ok: true, value: parsed };
}

/** First N label/value pairs for product-card chips. */
export function chipsFromSpecGroups(
  groups: ParsedSpecGroup[],
): Array<{ label: string; value: string }> {
  const chips: Array<{ label: string; value: string }> = [];
  for (const group of groups) {
    for (const row of group.rows) {
      chips.push({ label: row.key, value: row.value });
      if (chips.length >= SPEC_CHIP_SYNC_MAX) {
        return chips;
      }
    }
  }
  return chips;
}

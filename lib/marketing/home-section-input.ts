/**
 * Pure rules for the homepage product sections (AD-357) — shared by the server
 * module, the admin screen and the test suite, so the three can never disagree.
 * No database and no server-only imports, so a client component may use it.
 */

/** A homepage section shows at most this many chosen products. */
export const HOME_SECTION_MAX = 10;

export const HOME_SECTION_IDS = ["featured", "deals"] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export function isHomeSectionId(value: unknown): value is HomeSectionId {
  return (
    typeof value === "string" &&
    (HOME_SECTION_IDS as readonly string[]).includes(value)
  );
}

const MAX_ID_LENGTH = 100;

export type ParsedHomeSectionIds =
  | { ok: true; ids: string[] }
  | { ok: false; formError: string };

/**
 * Validates the product ids an operator submitted for one section: must be a
 * list of text ids; blanks are dropped, duplicates keep their first position,
 * and more than the maximum is an ERROR, never a silent cut (a silent cut would
 * drop the products the operator chose last). An empty list is valid: it clears
 * the section, which then falls back to the automatic list.
 */
export function parseHomeSectionProductIds(raw: unknown): ParsedHomeSectionIds {
  if (!Array.isArray(raw)) {
    return { ok: false, formError: "Send the products as a list." };
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== "string") {
      return { ok: false, formError: "Each product must be an id." };
    }
    const id = value.trim();
    if (!id) {
      continue;
    }
    if (id.length > MAX_ID_LENGTH) {
      return { ok: false, formError: "One of the products is not valid." };
    }
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  if (ids.length > HOME_SECTION_MAX) {
    return {
      ok: false,
      formError: `A homepage section holds at most ${HOME_SECTION_MAX} products.`,
    };
  }
  return { ok: true, ids };
}

/** Moves the item at `index` one place up or down; out-of-range moves change nothing. */
export function moveInList<T>(
  list: readonly T[],
  index: number,
  direction: "up" | "down",
): T[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return [...list];
  }
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}

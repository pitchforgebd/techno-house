/**
 * Catalogue text clean-up rules (SEO phase 5), pure so they can be tested and
 * reported on without touching data. Used by scripts/fix-catalog-text.mjs.
 */
import { normalizeSlug } from "@/lib/content/slug";

export const NAME_RULES = [
  "smat_watch",
  "ryzen_ai",
  "hash_leading_code",
  "hash_stray",
  "glued_unit",
  "double_space",
] as const;
export type NameRule = (typeof NAME_RULES)[number];

/** "3813C001AA # Canon DADF-BA1": a POS part code, then "#", then the name. */
const LEADING_CODE = /^([A-Za-z0-9][A-Za-z0-9./+-]{3,})\s*#\s+(.+)$/u;
const STORAGE_WORD = "RAM|ROM|SSD|HDD|LPDDR\\d?X?|GDDR\\d?X?|DDR\\d?|NVME|EMMC|PCIE";
const GLUED_UNIT = new RegExp(
  `(?:(?<![A-Za-z0-9])|(?<=\\d[xX]))(\\d+(?:\\.\\d+)?\\s?(?:GB|TB|MB))(?=(?:${STORAGE_WORD})(?![a-z]))`,
  "giu",
);

/**
 * Proposed product name, and which rules changed it. `only` limits the rules.
 *
 * A leading part code moves to the end in brackets instead of being dropped
 * ("Canon DADF-BA1 (3813C001AA)"): it removes the "#" without losing the
 * code, which staff and customers search by.
 */
export function fixProductName(
  name: string,
  only: readonly NameRule[] = NAME_RULES,
): { name: string; rules: NameRule[] } {
  let text = name;
  const rules: NameRule[] = [];
  const apply = (rule: NameRule, next: string) => {
    if (only.includes(rule) && next !== text) {
      text = next;
      rules.push(rule);
    }
  };

  apply("smat_watch", text.replace(/\b(s)mat(\s+watch)/giu, (_, s: string, rest: string) =>
    `${s}${s === "S" && /WATCH/.test(rest) ? "MART" : "mart"}${rest}`,
  ));
  apply("ryzen_ai", text.replace(/\b(ryzen\s+)al\b/giu, "$1AI"));

  const leading = text.match(LEADING_CODE);
  if (leading && /\d/.test(leading[1]!)) {
    const [, code, rest] = leading;
    apply(
      "hash_leading_code",
      rest!.toLowerCase().includes(code!.toLowerCase()) ? rest! : `${rest!.trimEnd()} (${code})`,
    );
  }
  apply("hash_stray", text.replace(/\s+#(?=\s|$)/gu, ""));
  apply("glued_unit", text.replace(GLUED_UNIT, "$1 "));
  apply("double_space", text.replace(/[ \t]{2,}/gu, " ").trim());
  return { name: text, rules };
}

/** What the importer would have produced before its 80-character cut. */
function fullSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type SlugIssue = "copy" | "truncated_mid_word";

/**
 * Only real damage counts: a "-copy" clone suffix, or a slug cut in the middle
 * of a word. A long slug that ends on a whole word is left alone.
 */
export function slugIssue(slug: string, name: string): SlugIssue | null {
  if (/-copy(-\d+)?$/.test(slug)) {
    return "copy";
  }
  const full = fullSlug(name);
  return full.length > slug.length && full.startsWith(slug) && full[slug.length] !== "-"
    ? "truncated_mid_word"
    : null;
}

/** Proposed slug, or null when no safe one exists (needs a human). */
export function proposeSlug(
  slug: string,
  name: string,
  taken: ReadonlySet<string>,
): string | null {
  const issue = slugIssue(slug, name);
  if (!issue) {
    return null;
  }
  let proposal: string;
  if (issue === "copy") {
    // normalizeSlug cuts at 80 characters, which can leave a trailing hyphen.
    proposal = normalizeSlug(name).replace(/-+$/, "");
    if (proposal === slug || /-copy(-\d+)?$/.test(proposal)) {
      proposal = slug.replace(/-copy(-\d+)?$/, "");
    }
  } else {
    // Finish the word that was cut, rather than shortening the URL further.
    const full = fullSlug(name);
    const nextDash = full.indexOf("-", slug.length);
    proposal = nextDash === -1 ? full : full.slice(0, nextDash);
  }
  return proposal && proposal !== slug && !taken.has(proposal) ? proposal : null;
}

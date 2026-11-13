/**
 * What the apply script does with one product (SEO phase 8). PURE: the same
 * decision the dry run shows and `--apply` acts on, kept here so it can be
 * unit-tested (scripts/seo/check-product-seo.ts).
 *
 * A row is written only when nothing in the generated text is doubtful:
 * the gates come first and always win over the "stored text" rules.
 */
import {
  SEO_DESC_MAX,
  SEO_DESC_MIN,
  SEO_TITLE_MAX,
  type SeoResult,
} from "@/lib/seo/product-seo";

export type StoredMeta = {
  metaTitle: string | null;
  metaDescription: string | null;
  seoSource: string | null;
};

/** Fewest specs a description must state before a row is written (the default). */
export const DEFAULT_MIN_SPECS = 3;

/**
 * `minSpecs` is the explicit minimum (0-4). `allowFewSpecs` is the old switch for "no minimum" (= 0); an
 * explicit `minSpecs` wins over it. Neither: DEFAULT_MIN_SPECS.
 */
export type ApplyOptions = { overwrite?: boolean; allowFewSpecs?: boolean; minSpecs?: number };
export const effectiveMinSpecs = (options: ApplyOptions = {}): number =>
  options.minSpecs ?? (options.allowFewSpecs ? 0 : DEFAULT_MIN_SPECS);
export type ApplyDecision = { action: string; write: boolean };

const squash = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

/** The note on a skipped row that already carries generated text: the old text is NOT replaced, so say so. */
export const STALE_NOTE = " (generated text stays live)";

/**
 * Why a row's NEW text must not be written, or null when nothing blocks it. Safety gates first (never written, whatever
 * else is true), then the quality bar (lengths, minimum specs).
 */
function blocker(result: SeoResult, options: ApplyOptions): string | null {
  if (result.flags.includes("model_token_lost")) return "skip: model_token_lost";
  if (result.flags.includes("foreign_code")) return "skip: foreign_code";
  if (result.flags.includes("bad_chars")) return "skip: bad_chars";
  if (result.flags.includes("spec_zero")) return "skip: spec_zero";
  // v2.4 / v2.5 gates: a form factor the name contradicts, machine-looking spec wording, a type that is only a bucket name,
  // an identity the title lost.
  if (result.flags.includes("claim_conflict")) return "skip: claim_conflict";
  if (result.flags.includes("bad_spec_phrase")) return "skip: bad_spec_phrase";
  // v2.5: the title cannot keep what the name says IS the product (capacity, DDR generation, Combo) within 60 characters.
  if (result.flags.includes("identity_lost")) return "skip: identity_lost";
  if (result.flags.includes("unusable_type") || !result.type) return "skip: unusable_type";
  if (result.needsReview) return "skip: needs_review";
  if (result.title.length > SEO_TITLE_MAX) return "skip: title over 60";
  if (result.metaDescription.length < SEO_DESC_MIN || result.metaDescription.length > SEO_DESC_MAX) {
    return "skip: description outside 120-155";
  }
  const minSpecs = effectiveMinSpecs(options);
  if (result.specsAvailable < minSpecs) {
    // A claim the name / trusted specs do not back is dropped from the text; the row is called an unsupported_claim skip only
    // when that is what left it short (with those specs it would have reached the minimum).
    const claim = result.flags.includes("unsupported_claim") && result.specsAvailable + (result.claimSpecsDropped ?? 0) >= minSpecs
      ? `unsupported_claim: fewer than ${minSpecs} specs once it is dropped`
      : null;
    if (claim) return `skip: ${claim}`;
    return minSpecs === DEFAULT_MIN_SPECS
      ? "skip: fewer than 3 specs (use --allow-few-specs)"
      : `skip: fewer than ${minSpecs} specs (--min-specs=${minSpecs})`;
  }
  return null;
}

/**
 * What to do with one product. For a row that already has GENERATED text (a refresh from a batch file) the answer is
 * always one of: `update` (the text changed), `unchanged`, or a skip that says the generated text stays live. Hand-written
 * text (seoSource 'admin') and text with no source are never touched without --overwrite.
 */
export function decideApply(
  result: SeoResult,
  stored: StoredMeta,
  options: ApplyOptions = {},
): ApplyDecision {
  const hasStored = Boolean(squash(stored.metaTitle) || squash(stored.metaDescription));
  const blocked = blocker(result, options);
  if (blocked) {
    return { action: hasStored && stored.seoSource === "generated" ? `${blocked}${STALE_NOTE}` : blocked, write: false };
  }
  if (hasStored && stored.seoSource !== "generated" && !options.overwrite) {
    return {
      action:
        stored.seoSource === "admin"
          ? "skip: written by hand (use --overwrite)"
          : "skip: has stored text with no source (use --overwrite)",
      write: false,
    };
  }
  if (
    hasStored &&
    stored.seoSource === "generated" &&
    squash(stored.metaTitle) === result.title &&
    squash(stored.metaDescription) === result.metaDescription
  ) {
    return { action: "unchanged", write: false };
  }
  return { action: hasStored ? "update" : "write", write: true };
}

/** The rows `--apply` writes: new text (`write`) and refreshed generated text (`update`); never unchanged or skipped rows. */
export function rowsToWrite<T extends { decision: ApplyDecision; alt?: unknown }>(rows: T[]): T[] {
  return rows.filter((row) => row.decision.write || Boolean(row.alt));
}

/** Rows whose generated text stays live because the new text is blocked (listed in the dry run: nothing is silent). */
export const isStaleGenerated = (decision: ApplyDecision) => decision.action.endsWith(STALE_NOTE);

/** Count rows per action, most common first. */
export function countActions(decisions: ApplyDecision[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const { action } of decisions) counts.set(action, (counts.get(action) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

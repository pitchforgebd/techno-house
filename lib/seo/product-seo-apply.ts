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

export type ApplyOptions = { overwrite?: boolean; allowFewSpecs?: boolean };
export type ApplyDecision = { action: string; write: boolean };

const squash = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

export function decideApply(
  result: SeoResult,
  stored: StoredMeta,
  options: ApplyOptions = {},
): ApplyDecision {
  // Safety gates: never written, whatever else is true.
  if (result.flags.includes("model_token_lost")) return { action: "skip: model_token_lost", write: false };
  if (result.flags.includes("foreign_code")) return { action: "skip: foreign_code", write: false };
  if (result.flags.includes("bad_chars")) return { action: "skip: bad_chars", write: false };
  if (result.flags.includes("spec_zero")) return { action: "skip: spec_zero", write: false };
  if (result.needsReview) return { action: "skip: needs_review", write: false };
  if (result.title.length > SEO_TITLE_MAX) return { action: "skip: title over 60", write: false };
  if (result.metaDescription.length < SEO_DESC_MIN || result.metaDescription.length > SEO_DESC_MAX) {
    return { action: "skip: description outside 120-155", write: false };
  }
  if (result.specsAvailable < 3 && !options.allowFewSpecs) {
    return { action: "skip: fewer than 3 specs (use --allow-few-specs)", write: false };
  }
  const hasStored = Boolean(squash(stored.metaTitle) || squash(stored.metaDescription));
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
  return { action: hasStored ? "update (generated -> new generated)" : "write", write: true };
}

/** Count rows per action, most common first. */
export function countActions(decisions: ApplyDecision[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const { action } of decisions) counts.set(action, (counts.get(action) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

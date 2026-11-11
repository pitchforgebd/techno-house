/**
 * Batch selection and the filter funnel of the product SEO apply tooling (SEO phase 8, v2.3). PURE.
 *
 * `--select-batch` and `--explain-filter` both ask ONE question per product: "which criteria does it fail?"
 * (`failedCriteria`). Selecting = no failures; the funnel = counting the failures. Because they share the
 * function, the report cannot disagree with the selection.
 *
 * Criteria, in the order the filter applies them (stock is ignored on purpose):
 *   price > 0, a real image, not "coming soon", a real brand, a usable product type, at least `minSpecs`
 *   specs (default 3), a resolved unique title, none of the gate flags (model_token_lost, foreign_code,
 *   bad_chars, spec_zero, claim_conflict, bad_spec_phrase), valid lengths (title <= 60, description 120-155).
 * Products that already have stored text are not part of the population: they are never selected.
 */
import { DEFAULT_MIN_SPECS } from "@/lib/seo/product-seo-apply";
import { SEO_DESC_MAX, SEO_DESC_MIN, SEO_TITLE_MAX, type SeoResult } from "@/lib/seo/product-seo";

export const GENERIC_BRAND = /^(?:no ?brand|unbranded|other|others|generic|unknown|n\/a)$/i;

export type BatchCandidate = {
  name: string;
  priceAmount: number;
  isComingSoon: boolean;
  hasRealImage: boolean;
  brand: string;
  /** A stored meta title or description (any source). */
  hasStoredText: boolean;
  storedSource: string | null;
  result: SeoResult;
};

export type CriterionId =
  | "price"
  | "image"
  | "coming_soon"
  | "brand"
  | "type"
  | "specs"
  | "unique_title"
  | "model_token_lost"
  | "foreign_code"
  | "bad_chars"
  | "spec_zero"
  | "claim_conflict"
  | "bad_spec_phrase"
  | "lengths";

export const CRITERIA: { id: CriterionId; label: (minSpecs: number) => string }[] = [
  { id: "price", label: () => "price > 0" },
  { id: "image", label: () => "real image (not the placeholder)" },
  { id: "coming_soon", label: () => "not marked coming soon" },
  { id: "brand", label: () => "real brand (not empty / No brand / Generic)" },
  { id: "type", label: () => "usable product type (not a bucket like \"Mobile Accessory\")" },
  { id: "specs", label: (min) => (min === 0 ? "specs: any number (title + type only is enough)" : `at least ${min} spec${min === 1 ? "" : "s"}`) },
  { id: "unique_title", label: () => "resolved unique title (no collision)" },
  { id: "model_token_lost", label: () => "gate: model_token_lost" },
  { id: "foreign_code", label: () => "gate: foreign_code" },
  { id: "bad_chars", label: () => "gate: bad_chars" },
  { id: "spec_zero", label: () => "gate: spec_zero" },
  { id: "claim_conflict", label: () => "gate: claim_conflict" },
  { id: "bad_spec_phrase", label: () => "gate: bad_spec_phrase" },
  { id: "lengths", label: () => `valid lengths (title <= ${SEO_TITLE_MAX}, description ${SEO_DESC_MIN}-${SEO_DESC_MAX})` },
];

/** Every criterion this product fails, in filter order. Empty = eligible. */
export function failedCriteria(candidate: BatchCandidate, minSpecs: number = DEFAULT_MIN_SPECS): CriterionId[] {
  const { result } = candidate;
  const brand = candidate.brand.replace(/\s+/g, " ").trim();
  const failed: CriterionId[] = [];
  if (!(candidate.priceAmount > 0)) failed.push("price");
  if (!candidate.hasRealImage) failed.push("image");
  if (candidate.isComingSoon) failed.push("coming_soon");
  if (!brand || GENERIC_BRAND.test(brand)) failed.push("brand");
  if (!result.type || result.flags.includes("unusable_type")) failed.push("type");
  if (result.specsAvailable < minSpecs) failed.push("specs");
  if (result.flags.includes("title_collision")) failed.push("unique_title");
  for (const gate of ["model_token_lost", "foreign_code", "bad_chars", "spec_zero", "claim_conflict", "bad_spec_phrase"] as const) {
    if (result.flags.includes(gate)) failed.push(gate);
  }
  if (
    result.title.length > SEO_TITLE_MAX ||
    result.metaDescription.length < SEO_DESC_MIN ||
    result.metaDescription.length > SEO_DESC_MAX
  ) {
    failed.push("lengths");
  }
  return failed;
}

/** Eligible for a batch: no stored text and no failed criterion at this minimum. */
export const isSelectable = (candidate: BatchCandidate, minSpecs: number = DEFAULT_MIN_SPECS) =>
  !candidate.hasStoredText && failedCriteria(candidate, minSpecs).length === 0;

// ---------------------------------------------------------------------------
// The funnel
// ---------------------------------------------------------------------------

export type FunnelStep = {
  id: CriterionId;
  label: string;
  /** Products that fail this criterion no matter what else they pass (the counts overlap). */
  ownFail: number;
  /** Products whose FIRST failed criterion is this one (the waterfall; the counts add up). */
  removed: number;
  left: number;
  examples: string[];
};

export type SpecFamilyRow = {
  family: string;
  total: number;
  zero: number;
  one: number;
  two: number;
  /** In this bucket AND passing every other criterion, if the minimum were 2 / 0. */
  passMin2: number;
  passMin0: number;
};

export type Funnel = {
  minSpecs: number;
  active: number;
  withStoredText: number;
  storedBySource: { source: string; count: number }[];
  total: number;
  steps: FunnelStep[];
  passing: number;
  whatIf: { min: number; passing: number }[];
  families: SpecFamilyRow[];
};

/** `count` names spread evenly over `names` (not just the first ones, which are one import batch). */
function spread(names: string[], count: number): string[] {
  if (names.length <= count) return names;
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) out.push(names[Math.floor((i * names.length) / count)] ?? "");
  return out;
}

export function buildFunnel(all: BatchCandidate[], minSpecs: number = DEFAULT_MIN_SPECS, exampleCount = 10): Funnel {
  const population = all.filter((c) => !c.hasStoredText);
  const stored = new Map<string, number>();
  for (const c of all) {
    if (c.hasStoredText) {
      const source = c.storedSource ?? "no source";
      stored.set(source, (stored.get(source) ?? 0) + 1);
    }
  }
  const failures = population.map((c) => failedCriteria(c, minSpecs));
  let remaining = population.map((_, i) => i);
  const steps: FunnelStep[] = CRITERIA.map(({ id, label }) => {
    const ownFail = failures.filter((f) => f.includes(id)).length;
    const removedIdx = remaining.filter((i) => failures[i]?.includes(id));
    remaining = remaining.filter((i) => !failures[i]?.includes(id));
    return {
      id,
      label: label(minSpecs),
      ownFail,
      removed: removedIdx.length,
      left: remaining.length,
      examples: spread(removedIdx.map((i) => `${population[i]?.name ?? ""} (${population[i]?.result.family ?? ""})`), exampleCount),
    };
  });
  const passAt = (min: number) => population.filter((c) => failedCriteria(c, min).length === 0);
  const byFamily = new Map<string, SpecFamilyRow>();
  for (const c of population) {
    if (c.result.specsAvailable >= DEFAULT_MIN_SPECS) continue;
    const row = byFamily.get(c.result.family) ?? { family: c.result.family, total: 0, zero: 0, one: 0, two: 0, passMin2: 0, passMin0: 0 };
    row.total += 1;
    if (c.result.specsAvailable === 0) row.zero += 1;
    else if (c.result.specsAvailable === 1) row.one += 1;
    else row.two += 1;
    if (failedCriteria(c, 2).length === 0) row.passMin2 += 1;
    if (failedCriteria(c, 0).length === 0) row.passMin0 += 1;
    byFamily.set(c.result.family, row);
  }
  return {
    minSpecs,
    active: all.length,
    withStoredText: all.length - population.length,
    storedBySource: [...stored.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    total: population.length,
    steps,
    passing: remaining.length,
    whatIf: [3, 2, 1, 0].map((min) => ({ min, passing: passAt(min).length })),
    families: [...byFamily.values()].sort((a, b) => b.total - a.total || a.family.localeCompare(b.family)),
  };
}

/** The step that removed the most products (where to look first). */
export function biggestBlocker(funnel: Funnel): FunnelStep | null {
  return [...funnel.steps].filter((s) => s.removed > 0).sort((a, b) => b.removed - a.removed)[0] ?? null;
}

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function renderFunnelMarkdown(funnel: Funnel, meta: { database: string; at: string; minSpecsNote: string }): string {
  const blocker = biggestBlocker(funnel);
  const stored = funnel.storedBySource.map((s) => `${s.source} ${s.count}`).join(", ");
  const lines: string[] = [
    "# Filter funnel: products without stored SEO text", "",
    `Database: ${meta.database} · ${meta.at}`,
    `Minimum specs: ${meta.minSpecsNote}. Stock is ignored. Read-only: nothing was changed.`, "",
    "| | products |", "|---|---|",
    `| Active products | ${funnel.active} |`,
    `| already have a stored title or description (never selected)${stored ? ` — ${stored}` : ""} | ${funnel.withStoredText} |`,
    `| **without stored text (this funnel)** | **${funnel.total}** |`, "",
    `## Waterfall (criteria in the order the filter applies them)`, "",
    "| # | criterion | fails on its own | removed here | left |", "|---|---|---|---|---|",
    `| 0 | start | | | ${funnel.total} |`,
    ...funnel.steps.map((s, i) => `| ${i + 1} | ${cell(s.label)} | ${s.ownFail} | ${s.removed} | ${s.left} |`),
    `| | **pass every criterion** | | | **${funnel.passing}** |`, "",
    "\"Fails on its own\" counts every product that fails that criterion, whatever else it passes, so the rows overlap. \"Removed here\" counts a product once, at the first criterion it fails, so the rows add up.", "",
    blocker
      ? `**Biggest blocker: ${blocker.label}** removes ${blocker.removed} of ${funnel.total}.`
      : funnel.total === 0 ? "**No product without stored text.**" : "**Nothing is removed: every product passes.**", "",
    "## What if the minimum number of specs were lower?", "",
    "| minimum specs | would pass | more than at 3 |", "|---|---|---|",
    ...funnel.whatIf.map((w) => `| ${w.min}${w.min === 0 ? " (title + type only)" : ""} | ${w.passing} | ${w.passing - (funnel.whatIf[0]?.passing ?? 0)} |`), "",
    `## The "fewer than ${DEFAULT_MIN_SPECS} specs" bucket, by family`, "",
    "| family | fewer than 3 specs | with 0 | with 1 | with 2 | pass everything else at min 2 | pass everything else at min 0 |", "|---|---|---|---|---|---|---|",
    ...funnel.families.map((f) => `| ${f.family} | ${f.total} | ${f.zero} | ${f.one} | ${f.two} | ${f.passMin2} | ${f.passMin0} |`),
    ...(funnel.families.length === 0 ? ["| (none) | 0 | 0 | 0 | 0 | 0 | 0 |"] : [
      `| **all families** | **${funnel.families.reduce((n, f) => n + f.total, 0)}** | ${funnel.families.reduce((n, f) => n + f.zero, 0)} | ${funnel.families.reduce((n, f) => n + f.one, 0)} | ${funnel.families.reduce((n, f) => n + f.two, 0)} | ${funnel.families.reduce((n, f) => n + f.passMin2, 0)} | ${funnel.families.reduce((n, f) => n + f.passMin0, 0)} |`,
    ]), "",
    "## Examples: up to 10 products per bucket (the bucket = the FIRST criterion the product fails)", "",
  ];
  for (const step of funnel.steps) {
    if (step.removed === 0) continue;
    lines.push(`### ${cell(step.label)} — ${step.removed} product${step.removed === 1 ? "" : "s"}`, "", ...step.examples.map((name) => `- ${name}`), "");
  }
  return `${lines.join("\n")}\n`;
}

/** The first `count` lines of a report, for printing the top of it. */
export const topLines = (text: string, count: number) => text.split("\n").slice(0, count).join("\n");

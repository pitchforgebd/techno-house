/**
 * Tests for the product SEO batch tooling (SEO phase 8, v2.3):
 *   lib/seo/apply-cli.ts            option parsing (--limit n / --limit=n, abort on a bad value, --min-specs)
 *   lib/seo/product-seo-batch.ts    the shared filter, the funnel and its report
 *   lib/seo/product-seo-apply.ts    the minimum-specs rule of decideApply
 *
 *   npm run test:seo-product        (runs this file after check-product-seo.ts)
 *
 * Pure functions only, plus a few child-process runs of scripts/seo/apply-product-seo.mjs with BAD options:
 * those must abort before the script opens the database, so no database is needed here either.
 */
import { spawnSync } from "node:child_process";
import {
  ArgError,
  DEFAULT_SELECT_COUNT,
  describeMinSpecs,
  limitNote,
  nextBatchNumber,
  parseApplyArgs,
} from "@/lib/seo/apply-cli";
import { DEFAULT_MIN_SPECS, decideApply, effectiveMinSpecs } from "@/lib/seo/product-seo-apply";
import {
  GENERIC_BRAND,
  biggestBlocker,
  buildFunnel,
  failedCriteria,
  isSelectable,
  renderFunnelMarkdown,
  topLines,
  type BatchCandidate,
} from "@/lib/seo/product-seo-batch";
import {
  SEO_DESC_MAX,
  SEO_DESC_MIN,
  SEO_TITLE_MAX,
  generateProductSeo,
  generateProductSeoSet,
  type SeoProductInput,
  type SeoResult,
} from "@/lib/seo/product-seo";

let checks = 0;
let failures = 0;
function check(name: string, condition: unknown, detail = ""): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}
const equal = (name: string, actual: unknown, expected: unknown) =>
  check(name, actual === expected, `expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
const parse = (...argv: string[]) => parseApplyArgs(argv);
function aborts(name: string, argv: string[], needle: string): void {
  try {
    parseApplyArgs(argv);
    check(name, false, `${argv.join(" ")} was accepted`);
  } catch (error) {
    check(name, error instanceof ArgError && error.message.includes(needle), `message: ${error instanceof Error ? error.message : error}`);
  }
}

// --- --limit: both spellings, abort on a missing / bad value ----------------------------------

{
  equal("--limit=20", parse("--limit=20").limit, 20);
  equal("--limit 20 (space)", parse("--limit", "20").limit, 20);
  equal("--limit 20 equals --limit=20", JSON.stringify(parse("--limit", "20")), JSON.stringify(parse("--limit=20")));
  equal("--limit with --apply (space)", parse("--apply", "--limit", "20").limit, 20);
  equal("--limit= with --apply", parse("--apply", "--limit=20", "--confirm-db=x").limit, 20);
  equal("--limit between other options", parse("--allow-few-specs", "--limit", "7", "--overwrite").limit, 7);
  equal("no --limit -> null", parse().limit, null);
  aborts("--limit with no value at the end", ["--limit"], "--limit needs a value");
  aborts("--limit followed by another option", ["--limit", "--apply"], "--limit needs a value");
  aborts("--limit= empty", ["--limit="], "--limit needs a value");
  aborts("--limit=abc", ["--limit=abc"], "must be a whole number");
  aborts("--limit abc (space)", ["--limit", "abc"], "must be a whole number");
  aborts("--limit=0", ["--limit=0"], "from 1");
  aborts("--limit=-3", ["--limit=-3"], "must be a whole number");
  aborts("--limit -3 (space)", ["--limit", "-3"], "must be a whole number");
  aborts("--limit=2.5", ["--limit=2.5"], "must be a whole number");
  aborts("--limit=20x", ["--limit=20x"], "must be a whole number");
  aborts("--limit=1e3", ["--limit=1e3"], "must be a whole number");
  aborts("--limit given twice", ["--limit=5", "--limit", "6"], "twice");
  aborts("a typo'd option is not silently ignored", ["--limt=20"], "Unknown option --limt");
  aborts("a stray word is not silently ignored", ["--limit", "20", "30"], "Unexpected argument");
  aborts("--apply alone never writes everything", ["--apply"], "--apply needs --batch-file");
  equal("--apply with --batch-file is fine", parse("--apply", "--batch-file", "batch-2.csv").batchFile, "batch-2.csv");
  aborts("a flag takes no value", ["--apply=yes", "--limit=1"], "takes no value");
  aborts("--apply and --select-batch together", ["--apply", "--limit=1", "--select-batch"], "only one of");
  aborts("--select-batch does not take --limit", ["--select-batch", "--limit=5"], "--limit and --batch-file do not apply");
  aborts("--restore does not take --limit", ["--restore=b.json", "--limit=5"], "do not apply");
  equal("--restore (space)", parse("--restore", "backup.json").restore, "backup.json");
  equal("the limit note", limitNote(20, 413), "limited to 20 of 413");
  equal("the limit note when fewer exist", limitNote(15, 15), "limited to 15 of 15");
}

// --- --select-batch ------------------------------------------------------------------------------

{
  const none = parse("--select-batch");
  check("--select-batch alone: select, default size", none.select && none.selectCount === DEFAULT_SELECT_COUNT && DEFAULT_SELECT_COUNT === 500);
  equal("--select-batch=300", parse("--select-batch=300").selectCount, 300);
  equal("--select-batch 300 (space)", parse("--select-batch", "300").selectCount, 300);
  check("--select-batch then a flag keeps the default size and reads the flag", (() => { const a = parse("--select-batch", "--allow-few-specs"); return a.selectCount === 500 && a.allowFewSpecs && a.select; })());
  // The bug: the flag was ignored when selecting. The selection now takes its minimum from the same parse as everything else.
  check("--select-batch=500 --allow-few-specs selects with minimum 0", (() => { const a = parse("--select-batch=500", "--allow-few-specs"); return a.select && a.minSpecs === 0; })());
  check("--select-batch=500 --min-specs=2 selects with minimum 2", (() => { const a = parse("--select-batch=500", "--min-specs=2"); return a.select && a.minSpecs === 2; })());
  check("--select-batch=500 alone selects with minimum 3", parse("--select-batch=500").minSpecs === 3);
  aborts("--select-batch=abc", ["--select-batch=abc"], "must be a whole number");
  aborts("--select-batch= empty", ["--select-batch="], "has no value");
  aborts("--select-batch=0", ["--select-batch=0"], "from 1");
  check("no --select-batch: not selecting", !parse().select);
}

// --- minimum specs -------------------------------------------------------------------------------

{
  const d = parse();
  check("default minimum is 3", d.minSpecs === 3 && d.minSpecsSource === "default" && DEFAULT_MIN_SPECS === 3);
  check("--allow-few-specs = minimum 0", parse("--allow-few-specs").minSpecs === 0 && parse("--allow-few-specs").minSpecsSource === "--allow-few-specs");
  check("--min-specs=2", parse("--min-specs=2").minSpecs === 2 && parse("--min-specs=2").minSpecsSource === "--min-specs=2");
  equal("--min-specs 2 (space)", parse("--min-specs", "2").minSpecs, 2);
  check("--min-specs wins over --allow-few-specs and says so", (() => { const a = parse("--allow-few-specs", "--min-specs=2"); return a.minSpecs === 2 && a.minSpecsSource.includes("wins over --allow-few-specs"); })());
  check("--min-specs=0 and --min-specs=4 are the ends", parse("--min-specs=0").minSpecs === 0 && parse("--min-specs=4").minSpecs === 4);
  aborts("--min-specs=5 (never more than 4 specs exist)", ["--min-specs=5"], "from 0 to 4");
  aborts("--min-specs=-1", ["--min-specs=-1"], "must be a whole number");
  aborts("--min-specs=x", ["--min-specs=x"], "must be a whole number");
  aborts("--min-specs with no value", ["--min-specs"], "--min-specs needs a value");
  check("the minimum is printed by describeMinSpecs", describeMinSpecs(parse("--min-specs=2")) === "minimum specs per description: 2 (--min-specs=2)" && describeMinSpecs(parse()).includes("3 (default)") && describeMinSpecs(parse("--allow-few-specs")).includes("title + type only"));
  equal("effectiveMinSpecs: default", effectiveMinSpecs({}), 3);
  equal("effectiveMinSpecs: allowFewSpecs", effectiveMinSpecs({ allowFewSpecs: true }), 0);
  equal("effectiveMinSpecs: explicit wins", effectiveMinSpecs({ allowFewSpecs: true, minSpecs: 2 }), 2);
}

// --- explain-filter and --out --------------------------------------------------------------------

{
  check("--explain-filter alone", parse("--explain-filter").explainFilter && !parse("--explain-filter").select);
  check("--explain-filter with --select-batch", (() => { const a = parse("--explain-filter", "--select-batch=300"); return a.explainFilter && a.select && a.selectCount === 300; })());
  aborts("--explain-filter is read-only (no --apply)", ["--explain-filter", "--apply", "--limit=5"], "read-only");
  aborts("--explain-filter is read-only (no --restore)", ["--explain-filter", "--restore=b.json"], "read-only");
  aborts("--explain-filter takes no --limit", ["--explain-filter", "--limit=5"], "takes no --limit");
  check("--out=<dir>", parse("--out=reports").outDir === "reports" && parse("--out=reports").outFile === null);
  check("--out=<file>.csv with --select-batch names the batch file", (() => { const a = parse("--select-batch", "--out=my-batch.csv"); return a.outFile === "my-batch.csv" && a.outDir === null; })());
  aborts("--out=<file>.csv is only for --select-batch", ["--out=x.csv"], "only names the batch file");
}

// --- batch file numbering: never an existing file -------------------------------------------------

{
  equal("empty folder -> batch-1", nextBatchNumber([]), 1);
  equal("batch-1 exists -> 2", nextBatchNumber(["batch-1.csv"]), 2);
  equal("gaps: the highest number + 1, never a hole that could be an old file", nextBatchNumber(["batch-1.csv", "batch-4.csv"]), 5);
  equal("a summary file reserves its number too", nextBatchNumber(["batch-1.csv", "batch-3-summary.md"]), 4);
  equal("two digits", nextBatchNumber(["batch-9.csv", "batch-12.csv"]), 13);
  equal("unrelated files are ignored", nextBatchNumber(["apply-preview.csv", "batch-x.csv", "filter-funnel.md", "batches.csv"]), 1);
}

// --- the shared filter ---------------------------------------------------------------------------

let n = 0;
function input(name: string, brand: string, chain: string[], specs: [string, string, string?][]): SeoProductInput {
  n += 1;
  return { id: `b${n}`, name, brand, categoryChain: chain, sku: `S${n}`, modelNumber: null, specs: specs.map(([label, value, key]) => ({ label, value, key })) };
}
const rich = generateProductSeo(input("Dell Latitude 7440 Core i7-1365U 16GB 512GB SSD 14 inch Laptop", "Dell", ["Laptop"], [["Processor", "Core i7-1365U", "processor"], ["RAM", "16GB", "ram"], ["Storage", "512GB SSD", "storage"], ["Display", "14 inch", "size"]]));
const thin = generateProductSeo(input("Logitech G102 Gaming Mouse", "Logitech", ["Mouse"], []));
check("fixture: the rich result has >= 3 specs and no gate", rich.specsAvailable >= 3 && !rich.needsReview && rich.metaDescription.length >= SEO_DESC_MIN && rich.metaDescription.length <= SEO_DESC_MAX, `${rich.specsAvailable} ${rich.flags.join(",")} ${rich.metaDescription.length}`);
check("fixture: the thin result has 0 specs, a valid description (a pointer, no claim)", thin.specsAvailable === 0 && thin.metaDescription.length >= SEO_DESC_MIN && thin.metaDescription.length <= SEO_DESC_MAX && !thin.needsReview, `${thin.specsAvailable} ${thin.metaDescription.length} ${thin.metaDescription}`);

const base = (result: SeoResult, over: Partial<BatchCandidate> = {}): BatchCandidate => ({
  name: "Fixture", priceAmount: 1000, isComingSoon: false, hasRealImage: true, brand: "Dell", hasStoredText: false, storedSource: null, result, ...over,
});
const flagged = (result: SeoResult, flag: string, extra: Partial<SeoResult> = {}): SeoResult => ({ ...result, flags: [...result.flags, flag], needsReview: true, ...extra });

{
  equal("a clean product passes", failedCriteria(base(rich)).length, 0);
  equal("price 0", failedCriteria(base(rich, { priceAmount: 0 })).join(), "price");
  equal("no real image", failedCriteria(base(rich, { hasRealImage: false })).join(), "image");
  equal("coming soon", failedCriteria(base(rich, { isComingSoon: true })).join(), "coming_soon");
  equal("empty brand", failedCriteria(base(rich, { brand: "  " })).join(), "brand");
  equal("generic brand: No brand", failedCriteria(base(rich, { brand: "No brand" })).join(), "brand");
  equal("generic brand: Generic", failedCriteria(base(rich, { brand: "generic" })).join(), "brand");
  check("GENERIC_BRAND does not catch real brands", !GENERIC_BRAND.test("Dell") && !GENERIC_BRAND.test("Others Inc"));
  equal("no usable type", failedCriteria(base({ ...rich, type: "" })).join(), "type");
  equal("fewer than 3 specs", failedCriteria(base(thin)).join(), "specs");
  equal("the same product at minimum 0 passes", failedCriteria(base(thin), 0).length, 0);
  equal("2 specs fail at 3 and pass at 2", `${failedCriteria(base({ ...rich, specsAvailable: 2 })).join()}|${failedCriteria(base({ ...rich, specsAvailable: 2 }), 2).length}`, "specs|0");
  equal("title collision", failedCriteria(base(flagged(rich, "title_collision"))).join(), "unique_title");
  equal("gate model_token_lost", failedCriteria(base(flagged(rich, "model_token_lost"))).join(), "model_token_lost");
  equal("gate foreign_code", failedCriteria(base(flagged(rich, "foreign_code"))).join(), "foreign_code");
  equal("gate bad_chars", failedCriteria(base(flagged(rich, "bad_chars"))).join(), "bad_chars");
  equal("gate spec_zero", failedCriteria(base(flagged(rich, "spec_zero"))).join(), "spec_zero");
  equal("gate claim_conflict", failedCriteria(base(flagged(rich, "claim_conflict"))).join(), "claim_conflict");
  equal("gate bad_spec_phrase", failedCriteria(base(flagged(rich, "bad_spec_phrase"))).join(), "bad_spec_phrase");
  equal("gate identity_lost (v2.5)", failedCriteria(base(flagged(rich, "identity_lost"))).join(), "identity_lost");
  equal("a type that is only a bucket (unusable_type) fails the type criterion", failedCriteria(base({ ...flagged(rich, "unusable_type"), type: "" })).join(), "type");
  equal("unusable_type fails the type criterion even if a type string is present", failedCriteria(base(flagged(rich, "unusable_type"))).join(), "type");
  equal("title over 60 is a length failure", failedCriteria(base(flagged(rich, "title_over_60", { title: "x".repeat(SEO_TITLE_MAX + 1) }))).join(), "lengths");
  equal("description under 120", failedCriteria(base({ ...rich, metaDescription: "x".repeat(SEO_DESC_MIN - 1) })).join(), "lengths");
  equal("description over 155", failedCriteria(base({ ...rich, metaDescription: "x".repeat(SEO_DESC_MAX + 1) })).join(), "lengths");
  equal("description exactly 120 and 155 pass", `${failedCriteria(base({ ...rich, metaDescription: "x".repeat(SEO_DESC_MIN) })).length}${failedCriteria(base({ ...rich, metaDescription: "x".repeat(SEO_DESC_MAX) })).length}`, "00");
  equal("several failures come out in filter order", failedCriteria(base(flagged(thin, "bad_chars"), { priceAmount: 0, hasRealImage: false })).join(), "price,image,specs,bad_chars");
  check("stored text is never selectable, whatever else is true", !isSelectable(base(rich, { hasStoredText: true, storedSource: "generated" })) && isSelectable(base(rich)));
  check("isSelectable follows the minimum", !isSelectable(base(thin)) && isSelectable(base(thin), 0));
}

// The same decision as the old inline predicate in the script (kept here to prove the refactor changed nothing at minimum 3).
{
  const oldPredicate = (c: BatchCandidate) => {
    const r = c.result;
    const brand = c.brand.replace(/\s+/g, " ").trim();
    return c.priceAmount > 0 && c.hasRealImage && !c.isComingSoon && Boolean(brand) && !GENERIC_BRAND.test(brand) &&
      Boolean(r.type) && r.specsAvailable >= 3 && !r.needsReview && !c.hasStoredText &&
      r.title.length <= SEO_TITLE_MAX && r.metaDescription.length >= SEO_DESC_MIN && r.metaDescription.length <= SEO_DESC_MAX;
  };
  const results: SeoResult[] = [
    rich, thin, { ...rich, specsAvailable: 2 }, { ...rich, type: "" },
    flagged(rich, "title_collision"), flagged(rich, "model_token_lost"), flagged(rich, "foreign_code"), flagged(rich, "bad_chars"), flagged(rich, "spec_zero"),
    flagged(rich, "title_over_60", { title: "y".repeat(70) }),
    flagged(rich, "claim_conflict"), flagged(rich, "bad_spec_phrase"), flagged(rich, "identity_lost"), { ...flagged(rich, "unusable_type"), type: "" },
    { ...rich, metaDescription: "short" }, { ...rich, metaDescription: "z".repeat(200) },
  ];
  let compared = 0;
  let same = true;
  for (const r of results) for (const priceAmount of [0, 500]) for (const hasRealImage of [true, false]) for (const isComingSoon of [false, true]) for (const brand of ["", "No brand", "Dell"]) for (const hasStoredText of [false, true]) {
    const c = base(r, { priceAmount, hasRealImage, isComingSoon, brand, hasStoredText });
    compared += 1;
    if (isSelectable(c, 3) !== oldPredicate(c)) same = false;
  }
  check(`the shared filter equals the old inline filter at minimum 3 (${compared} combinations)`, same);
}

// --- the funnel -----------------------------------------------------------------------------------

{
  const mk = (name: string, over: Partial<BatchCandidate> = {}, result: SeoResult = rich) => base(result, { name, ...over });
  const population: BatchCandidate[] = [
    ...Array.from({ length: 3 }, (_, i) => mk(`price-${i}`, { priceAmount: 0 })),
    ...Array.from({ length: 4 }, (_, i) => mk(`image-${i}`, { hasRealImage: false })),
    mk("image+price", { hasRealImage: false, priceAmount: 0 }), // removed at step 1 (price), but also fails the image on its own
    ...Array.from({ length: 12 }, (_, i) => mk(`thin-mouse-${i}`, {}, { ...thin, family: "mouse" })),
    ...Array.from({ length: 5 }, (_, i) => mk(`two-spec-monitor-${i}`, {}, { ...rich, family: "monitor", specsAvailable: 2 })),
    mk("one-spec-headphone", {}, { ...rich, family: "headphone", specsAvailable: 1 }),
    mk("collision", {}, flagged(rich, "title_collision")),
    mk("bad", {}, flagged(rich, "bad_chars")),
    mk("long-title", {}, flagged(rich, "title_over_60", { title: "t".repeat(80) })),
    ...Array.from({ length: 6 }, (_, i) => mk(`good-${i}`)),
    mk("already-generated", { hasStoredText: true, storedSource: "generated" }),
    mk("already-by-hand", { hasStoredText: true, storedSource: "admin" }),
  ];
  const f = buildFunnel(population, 3);
  equal("funnel: active", f.active, population.length);
  equal("funnel: stored text is not in the population", f.withStoredText, 2);
  equal("funnel: stored by source", f.storedBySource.map((s) => `${s.source}:${s.count}`).sort().join(), "admin:1,generated:1");
  equal("funnel: population", f.total, population.length - 2);
  const step = (id: string) => f.steps.find((s) => s.id === id);
  equal("funnel: price removes 4 (3 + the one that also lacks an image)", step("price")?.removed, 4);
  equal("funnel: price fails on its own for 4", step("price")?.ownFail, 4);
  equal("funnel: image removes 4 (the 5th was already gone)", step("image")?.removed, 4);
  equal("funnel: image fails on its own for 5", step("image")?.ownFail, 5);
  equal("funnel: specs removes 12 + 5 + 1", step("specs")?.removed, 18);
  equal("funnel: collision removes 1", step("unique_title")?.removed, 1);
  equal("funnel: bad_chars removes 1", step("bad_chars")?.removed, 1);
  equal("funnel: lengths removes 1", step("lengths")?.removed, 1);
  equal("funnel: passing", f.passing, 6);
  check("funnel: the v2.4 gates are steps of the waterfall", ["claim_conflict", "bad_spec_phrase", "identity_lost"].every((id) => step(id) !== undefined && step(id)?.removed === 0), f.steps.map((x) => x.id).join());
  check("funnel: the waterfall adds up", f.total - f.steps.reduce((sum, s) => sum + s.removed, 0) === f.passing);
  check("funnel: `left` only ever goes down and ends at passing", f.steps.every((s, i) => s.left <= (i === 0 ? f.total : f.steps[i - 1]?.left ?? 0)) && f.steps[f.steps.length - 1]?.left === f.passing);
  check("funnel: own failures are never fewer than removals", f.steps.every((s) => s.ownFail >= s.removed));
  equal("funnel: biggest blocker", biggestBlocker(f)?.id, "specs");
  const stepSpecs = step("specs");
  check("funnel: 10 examples at most, named with their family", (stepSpecs?.examples.length ?? 0) === 10 && (stepSpecs?.examples ?? []).every((e) => /\(\w[\w-]*\)$/.test(e)), JSON.stringify(stepSpecs?.examples));
  check("funnel: examples are spread, not just the first ten", (stepSpecs?.examples ?? []).some((e) => e.startsWith("two-spec-monitor")) || (stepSpecs?.examples ?? []).some((e) => e.startsWith("one-spec")));
  check("funnel: a bucket of 4 lists all 4", step("price")?.examples.length === 4);
  equal("what-if: minimum 3 / 2 / 1 / 0", f.whatIf.map((w) => `${w.min}:${w.passing}`).join(), "3:6,2:11,1:12,0:24");
  const fam = (name: string) => f.families.find((x) => x.family === name);
  equal("families: mouse bucket", `${fam("mouse")?.total}/${fam("mouse")?.zero}/${fam("mouse")?.passMin2}/${fam("mouse")?.passMin0}`, "12/12/0/12");
  equal("families: monitor bucket (2 specs)", `${fam("monitor")?.total}/${fam("monitor")?.two}/${fam("monitor")?.passMin2}/${fam("monitor")?.passMin0}`, "5/5/5/5");
  equal("families: headphone bucket (1 spec)", `${fam("headphone")?.total}/${fam("headphone")?.one}/${fam("headphone")?.passMin2}/${fam("headphone")?.passMin0}`, "1/1/0/1");
  equal("families: largest bucket first", f.families[0]?.family, "mouse");
  const atZero = buildFunnel(population, 0);
  equal("minimum 0: the specs criterion removes nothing", atZero.steps.find((s) => s.id === "specs")?.removed, 0);
  equal("minimum 0: passing equals the what-if number", atZero.passing, 24);

  const md = renderFunnelMarkdown(f, { database: "testdb", at: "2026-01-01T00:00:00Z", minSpecsNote: "3 (default)" });
  check("report: title, database, minimum", md.startsWith("# Filter funnel") && md.includes("Database: testdb") && md.includes("Minimum specs: 3 (default)"));
  check("report: the population block", md.includes("| Active products | 37 |") && md.includes("**without stored text (this funnel)** | **35**"), md.slice(0, 700));
  check("report: lists generated and hand-written stored text", md.includes("generated 1") && md.includes("admin 1"));
  check("report: a row per criterion with a waterfall", md.includes("| 1 | price > 0 | 4 | 4 | 31 |") && md.includes("gate: bad_chars") && md.includes("**pass every criterion**"));
  check("report: names the biggest blocker", md.includes("**Biggest blocker: at least 3 specs** removes 18 of 35."));
  check("report: the what-if table", md.includes("| 0 (title + type only) | 24 |") && md.includes("| 2 | 11 | 5 |"));
  check("report: the by-family table", md.includes("| mouse | 12 | 12 | 0 | 0 | 0 | 12 |") && md.includes("**all families**"));
  check("report: examples section", md.includes("## Examples") && md.includes("- price-0 (laptop)"));
  check("report: the top of the file shows the waterfall within the first 50 lines", topLines(md, 50).includes("**pass every criterion**") && topLines(md, 3).split("\n").length === 3);
  const empty = renderFunnelMarkdown(buildFunnel([], 3), { database: "d", at: "t", minSpecsNote: "3" });
  check("report: an empty database does not crash and says so", empty.includes("No product without stored text."));
  const all = renderFunnelMarkdown(buildFunnel([mk("ok")], 3), { database: "d", at: "t", minSpecsNote: "3" });
  check("report: everything passing says so", all.includes("Nothing is removed: every product passes."));
}

// --- decideApply and the minimum ------------------------------------------------------------------

{
  const stored = { metaTitle: null, metaDescription: null, seoSource: null };
  const two = { ...rich, specsAvailable: 2 };
  equal("decideApply: default minimum 3 keeps the old message", decideApply(two, stored).action, "skip: fewer than 3 specs (use --allow-few-specs)");
  equal("decideApply: --allow-few-specs writes", decideApply(two, stored, { allowFewSpecs: true }).write, true);
  equal("decideApply: minSpecs 2 writes a 2-spec row", decideApply(two, stored, { minSpecs: 2 }).write, true);
  equal("decideApply: minSpecs 2 skips a 1-spec row", decideApply({ ...rich, specsAvailable: 1 }, stored, { minSpecs: 2 }).action, "skip: fewer than 2 specs (--min-specs=2)");
  equal("decideApply: the gates still win at minimum 0", decideApply(flagged(thin, "bad_chars"), stored, { minSpecs: 0 }).action, "skip: bad_chars");
  equal("decideApply: a thin row with a valid description is written at 0", decideApply(thin, stored, { minSpecs: 0 }).write, true);
}

// --- the same collision logic runs for a set (sanity: the funnel input is what the script builds) ----

{
  const a = input("Acme Widget X100 Pro", "Acme", ["Mouse"], []);
  const b = { ...input("Acme Widget X100 Pro", "Acme", ["Mouse"], []), id: "other" };
  const results = generateProductSeoSet([a, b]);
  const cands = results.map((r, i) => base(r, { name: `dup-${i}` }));
  check("two identical names collide and neither is selectable", results.every((r) => r.flags.includes("title_collision")) && cands.every((c) => failedCriteria(c, 0).includes("unique_title") && !isSelectable(c, 0)));
}

// --- the script itself: bad options abort BEFORE the database is opened ---------------------------

function runScript(args: string[]): { status: number | null; out: string } {
  const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/seo/apply-product-seo.mjs", ...args], { encoding: "utf8", timeout: 60000 });
  return { status: run.status, out: `${run.stdout}${run.stderr}` };
}
for (const [args, needle] of [
  [["--limit"], "--limit needs a value"],
  [["--limit=abc"], "must be a whole number"],
  [["--limit=", "--apply"], "--limit needs a value"],
  [["--apply", "--limit"], "--limit needs a value"],
  [["--limt=20"], "Unknown option --limt"],
  [["--apply"], "--apply needs --batch-file"],
  [["--explain-filter", "--apply", "--limit=5"], "read-only"],
  [["--min-specs=9"], "from 0 to 4"],
] as [string[], string][]) {
  const run = runScript(args);
  check(`script ${args.join(" ")}: exit 1 with a clear message`, run.status === 1 && run.out.includes(needle), `status ${run.status}: ${run.out.slice(0, 200)}`);
  check(`script ${args.join(" ")}: aborted before the database (nothing was opened)`, !run.out.includes("database:"), run.out.slice(0, 200));
}

console.log(failures === 0 ? `ok ${checks} product-seo-batch checks` : `failed ${failures}/${checks} product-seo-batch checks`);
process.exit(failures === 0 ? 0 : 1);

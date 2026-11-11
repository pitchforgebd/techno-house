#!/usr/bin/env node
/**
 * Apply generated product SEO text — SEO phase 8.
 *
 *   npx tsx scripts/seo/apply-product-seo.mjs
 *       DRY RUN (default): generates title / meta description / keyword / alt for
 *       every active product, writes a review CSV, changes NOTHING.
 *   npx tsx scripts/seo/apply-product-seo.mjs --select-batch[=500]
 *       Picks the batch (quality filter + weighted round-robin over leaf
 *       categories) and writes docs/seo-reports/product-seo/batch-<N>.csv with the
 *       next free number (an existing batch file is never overwritten). Read-only.
 *   npx tsx scripts/seo/apply-product-seo.mjs --explain-filter [--select-batch]
 *       Read-only funnel report for the products WITHOUT stored text: how many fail
 *       each criterion on its own, a waterfall in the order the filter applies them,
 *       the "fewer than 3 specs" bucket by family, what a lower minimum would let
 *       through, 10 example names per bucket. Writes filter-funnel.md and prints its top.
 *   npx tsx scripts/seo/apply-product-seo.mjs --batch-file=batch-1.csv --apply --confirm-db=<database name>
 *       Writes metaTitle / metaDescription / seoKeyword (seoSource 'generated').
 *       Saves a JSON backup of every row it will touch FIRST, then writes in
 *       transactions of 200.
 *   npx tsx scripts/seo/apply-product-seo.mjs --restore=<backup.json> --confirm-db=<database name>
 *       Puts the backed-up values back (rows changed since the apply are skipped
 *       unless --force).
 *
 * Options:
 *   --batch-file=<csv>   only the products listed (column `id` or `slug`)
 *   --limit=<n>          at most n products (after the batch filter); `--limit n` works too.
 *                        A missing or non-numeric value aborts. The summary says "limited to N of M".
 *   --overwrite          also replace stored text that was written by hand
 *                        (seoSource 'admin') or by someone else (stored text with
 *                        no source); without it those rows are skipped
 *   --allow-few-specs    no minimum number of specs (= --min-specs=0): a product whose
 *                        description can only state its title + type is still written.
 *                        Applies to --select-batch, --explain-filter, the dry run and --apply.
 *   --min-specs=<0-4>    the minimum instead (default 3; wins over --allow-few-specs).
 *                        Every mode prints which minimum it used. A description with few specs
 *                        states only what the raw name / stored specs contain.
 *   --apply-alts         ALSO set the main image alt, but only where the current
 *                        alt equals the raw product name (default off)
 *   --out=<dir>          report / backup folder (default docs/seo-reports/product-seo)
 *   --out=<file>.csv     with --select-batch: the batch file to write (never overwritten)
 *
 * Titles are generated for ALL active products first (so collisions are found
 * across the whole catalogue), then filtered. A row is never written when its
 * title still collides with another product (needs_review), is over 60
 * characters, or its description is outside 120-155. Slugs are never touched.
 * Without --apply (and in --select-batch mode) the Prisma client is wrapped so
 * any write call throws. Run with tsx.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "@/lib/db/prisma";
import { ArgError, describeMinSpecs, limitNote, nextBatchNumber, parseApplyArgs } from "@/lib/seo/apply-cli";
import { productTitle } from "@/lib/seo/page-meta";
import { countActions, decideApply, isStaleGenerated, rowsToWrite } from "@/lib/seo/product-seo-apply";
import { biggestBlocker, buildFunnel, isSelectable, renderFunnelMarkdown, topLines } from "@/lib/seo/product-seo-batch";
import { generateProductSeoSet } from "@/lib/seo/product-seo";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

// Every option is checked up front: a missing / non-numeric value, an unknown or repeated option and
// impossible combinations abort here, before the database is opened (lib/seo/apply-cli.ts, unit-tested).
let ARGS;
try {
  ARGS = parseApplyArgs(process.argv.slice(2));
} catch (error) {
  console.error(`apply-product-seo: ${error instanceof ArgError ? error.message : error}`);
  process.exit(1);
}
const { apply: APPLY, overwrite: OVERWRITE, applyAlts: APPLY_ALTS, force: FORCE } = ARGS;
const RESTORE = ARGS.restore ?? undefined;
const CONFIRM_DB = ARGS.confirmDb ?? undefined;
const BATCH_FILE = ARGS.batchFile ?? undefined;
const LIMIT = ARGS.limit;
const SELECT = ARGS.select;
const SELECT_COUNT = ARGS.selectCount;
const EXPLAIN = ARGS.explainFilter;
const MIN_SPECS = ARGS.minSpecs;
const OUT_FILE = ARGS.outFile ? path.resolve(ARGS.outFile) : null;
const OUT = OUT_FILE ? path.dirname(OUT_FILE) : path.resolve(ARGS.outDir ?? "docs/seo-reports/product-seo");
const BATCH_SIZE = 200;
const PLACEHOLDER_IMAGE = "/products/placeholder.svg";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const WRITE_CALLS = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "upsert", "delete", "deleteMany", "$executeRaw", "$executeRawUnsafe", "$transaction"]);
/** Dry-run and selection modes cannot write: any write call throws. */
function readOnly(prisma) {
  const guard = (target) =>
    new Proxy(target, {
      get(obj, prop) {
        if (typeof prop === "string" && WRITE_CALLS.has(prop)) {
          return () => {
            throw new Error(`apply-product-seo: ${prop} is blocked outside --apply / --restore.`);
          };
        }
        const value = obj[prop];
        return value && typeof value === "object" && !prop.toString().startsWith("$")
          ? guard(value)
          : typeof value === "function"
            ? value.bind(obj)
            : value;
      },
    });
  return guard(prisma);
}

const databaseName = () => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
};
function requireConfirmedDb() {
  const actual = databaseName();
  if (!CONFIRM_DB || CONFIRM_DB !== actual) {
    throw new Error(`Refusing to write: pass --confirm-db=${actual || "<database name>"} to confirm the target database.`);
  }
}
const squash = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
/** `exclusive`: fail (EEXIST) instead of replacing an existing file. */
async function writeCsv(file, header, rows, { exclusive = false } = {}) {
  const lines = [header.join(","), ...rows.map((row) => header.map((key) => csvCell(row[key])).join(","))];
  await writeFile(path.resolve(OUT, file), `\ufeff${lines.join("\r\n")}\r\n`, { encoding: "utf8", flag: exclusive ? "wx" : "w" });
}
/** Minimal CSV reader (quotes, commas, CRLF) for the batch file. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [header = [], ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((name, i) => [name.trim(), (cells[i] ?? "").trim()])));
}

// ---------------------------------------------------------------------------
// load + generate
// ---------------------------------------------------------------------------

const PRODUCT_SELECT = {
  id: true, slug: true, name: true, sku: true, modelNumber: true, categoryId: true,
  priceAmount: true, isComingSoon: true, overview: true, overviewHtml: true, detailsHtml: true,
  metaTitle: true, metaDescription: true, seoKeyword: true, seoSource: true, seoGeneratedAt: true,
  brand: { select: { name: true } },
  images: { select: { id: true, src: true, alt: true, isPrimary: true, position: true } },
  attributeValues: { select: { value: true, attribute: { select: { key: true, label: true } } } },
  specChips: { select: { label: true, value: true } },
  specGroups: { select: { rows: { select: { label: true, value: true } } } },
};

async function loadProducts(prisma) {
  const all = [];
  let cursor;
  for (;;) {
    const batch = await prisma.product.findMany({
      where: { isActive: true }, select: PRODUCT_SELECT, orderBy: { id: "asc" }, take: 500,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    all.push(...batch);
    cursor = batch[batch.length - 1].id;
  }
  return all;
}

function categoryChains(categories) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return (id) => {
    const chain = [];
    const seen = new Set();
    for (let cur = byId.get(id); cur && !seen.has(cur.id); cur = cur.parentId ? byId.get(cur.parentId) : undefined) {
      seen.add(cur.id);
      chain.push(cur.name);
    }
    return chain;
  };
}

const mainImage = (product) =>
  [...product.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)[0] ?? null;
const hasRealImage = (product) => product.images.some((image) => image.src && image.src !== PLACEHOLDER_IMAGE);
const hasDescription = (product) =>
  product.overview.some((line) => line.trim()) || Boolean(product.overviewHtml?.trim()) || Boolean(product.detailsHtml?.trim());

function toInput(product, chainOf) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    modelNumber: product.modelNumber,
    brand: squash(product.brand?.name),
    categoryChain: chainOf(product.categoryId),
    specs: [
      ...product.attributeValues.map((entry) => ({ key: entry.attribute.key, label: entry.attribute.label, value: entry.value })),
      ...product.specChips.map((chip) => ({ label: chip.label, value: chip.value })),
      ...product.specGroups.flatMap((group) => group.rows.map((row) => ({ label: row.label, value: row.value }))),
    ],
  };
}

async function generateAll(prisma) {
  const categories = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
  const chainOf = categoryChains(categories);
  const products = await loadProducts(prisma);
  const results = generateProductSeoSet(products.map((product) => toInput(product, chainOf)));
  return products.map((product, i) => ({ product, result: results[i], chain: chainOf(product.categoryId) }));
}

// ---------------------------------------------------------------------------
// decisions
// ---------------------------------------------------------------------------

/** What would happen to this product, and why (lib/seo/product-seo-apply.ts, unit-tested). */
function decide({ product, result }) {
  return decideApply(result, product, { overwrite: OVERWRITE, minSpecs: MIN_SPECS });
}

function altChange({ product, result }) {
  if (!APPLY_ALTS || result.needsReview) return null;
  const image = mainImage(product);
  if (!image || image.src === PLACEHOLDER_IMAGE) return null;
  // Only an alt that is just the raw product name is replaced; a hand-written alt stays.
  if (squash(image.alt).toLowerCase() !== squash(product.name).toLowerCase()) return null;
  if (squash(image.alt) === result.imageAlt) return null;
  return { imageId: image.id, before: image.alt, after: result.imageAlt };
}

async function readBatchFilter() {
  if (!BATCH_FILE) return null;
  const rows = parseCsv(await readFile(path.resolve(BATCH_FILE), "utf8"));
  const ids = new Set(rows.map((r) => r.id).filter(Boolean));
  const slugs = new Set(rows.map((r) => r.slug).filter(Boolean));
  if (ids.size === 0 && slugs.size === 0) throw new Error(`${BATCH_FILE} has no id or slug column.`);
  return { ids, slugs };
}

async function plan(prisma) {
  const all = await generateAll(prisma);
  const filter = await readBatchFilter();
  let chosen = filter ? all.filter(({ product }) => filter.ids.has(product.id) || filter.slugs.has(product.slug)) : all;
  if (filter) {
    const missing = [...filter.ids].filter((id) => !all.some(({ product }) => product.id === id)).length +
      [...filter.slugs].filter((slug) => !all.some(({ product }) => product.slug === slug)).length;
    if (missing > 0) console.log(`note: ${missing} id/slug in the batch file are not active products and are ignored`);
  }
  const beforeLimit = chosen.length;
  if (LIMIT) chosen = chosen.slice(0, LIMIT);
  return {
    all,
    limit: LIMIT ? { kept: chosen.length, of: beforeLimit } : null,
    rows: chosen.map((entry) => ({ ...entry, decision: decide(entry), alt: altChange(entry) })),
  };
}

// ---------------------------------------------------------------------------
// modes
// ---------------------------------------------------------------------------

function previewRow({ product, result, decision, alt }, chain) {
  return {
    id: product.id, slug: product.slug, name: product.name, category: [...chain].reverse().join(" > "),
    action: decision.action,
    current_title: productTitle(product.name, product.brand?.name ?? ""),
    stored_title: product.metaTitle ?? "", stored_source: product.seoSource ?? "",
    new_title: result.title, new_title_len: result.title.length, title_rule: result.titleRule,
    new_meta_description: result.metaDescription, new_meta_len: result.metaDescription.length,
    keyword: result.primaryKeyword, secondary_keywords: result.secondaryKeywords.join(" | "),
    flags: result.flags.join("; "), model_tokens_lost: result.modelTokensLost.join(" "), bad_chars: result.badChars.join(" | "), zero_specs: result.zeroSpecs.join(" | "),
    claim_conflicts: result.claimConflicts.join(" | "), bad_spec_phrases: result.badSpecPhrases.join(" | "), unsupported_claims: result.unsupportedClaims.join(" | "), type: result.type, collision_group: result.collisionGroup ?? "",
    new_alt: result.imageAlt, alt_action: alt ? `set (was "${alt.before}")` : "",
  };
}
const PREVIEW_HEADER = ["id", "slug", "name", "category", "action", "current_title", "stored_title", "stored_source", "new_title", "new_title_len", "title_rule", "new_meta_description", "new_meta_len", "keyword", "secondary_keywords", "flags", "model_tokens_lost", "bad_chars", "zero_specs", "claim_conflicts", "bad_spec_phrases", "unsupported_claims", "type", "collision_group", "new_alt", "alt_action"];

async function writePreview(rows, limit) {
  await mkdir(OUT, { recursive: true });
  await writeCsv("apply-preview.csv", PREVIEW_HEADER, rows.map((entry) => previewRow(entry, entry.chain)));
  const lost = rows.filter(({ result }) => result.flags.includes("model_token_lost"));
  const foreign = rows.filter(({ result }) => result.flags.includes("foreign_code"));
  const badChars = rows.filter(({ result }) => result.flags.includes("bad_chars"));
  const zeroSpec = rows.filter(({ result }) => result.flags.includes("spec_zero"));
  const kinds = new Map();
  for (const { result } of badChars) for (const kind of result.badChars) kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  const noSuffix = rows.filter(({ result }) => result.flags.includes("title_without_price_suffix")).length;
  // v2.4 gates and the refresh view
  const conflicts = rows.filter(({ result }) => result.flags.includes("claim_conflict"));
  const badSpec = rows.filter(({ result }) => result.flags.includes("bad_spec_phrase"));
  const noType = rows.filter(({ result }) => result.flags.includes("unusable_type"));
  const claimDropped = rows.filter(({ result }) => result.flags.includes("unsupported_claim"));
  const claimKinds = new Map();
  for (const { result } of claimDropped) for (const kind of result.unsupportedClaims) claimKinds.set(kind, (claimKinds.get(kind) ?? 0) + 1);
  const claimSkipped = claimDropped.filter(({ decision }) => decision.action.startsWith("skip: unsupported_claim")).length;
  const generatedRows = rows.filter(({ product }) => product.seoSource === "generated" && (squash(product.metaTitle) || squash(product.metaDescription)));
  const refreshCount = (action) => generatedRows.filter(({ decision }) => decision.action === action).length;
  const stale = generatedRows.filter(({ decision }) => isStaleGenerated(decision));
  const list = (items, text) => [...items.slice(0, 25).map(text), ...(items.length > 25 ? [`- … ${items.length - 25} more (see apply-preview.csv)`] : [])];
  const lines = [
    `# Product SEO ${APPLY ? "APPLY" : "DRY RUN"}`, "",
    `Database: ${databaseName()} · ${new Date().toISOString()} · ${rows.length} product(s)${BATCH_FILE ? ` from ${BATCH_FILE}` : ""}`,
    ...(limit ? [`--limit ${LIMIT}: ${limitNote(limit.kept, limit.of)}`] : []),
    describeMinSpecs(ARGS), "",
    "| action | products |", "|---|---|",
    ...countActions(rows.map((r) => r.decision)).map(([action, n]) => `| ${action} | ${n} |`), "",
    `**model_token_lost: ${lost.length}** (never written; model token missing from the title)${lost.length ? ":" : ""}`,
    ...lost.slice(0, 25).map(({ product, result }) => `- ${product.slug}: lost ${result.modelTokensLost.join(", ")}`),
    ...(lost.length > 25 ? [`- … ${lost.length - 25} more (column model_tokens_lost in apply-preview.csv)`] : []), "",
    `foreign_code (a code in the title that is not in the raw name; never written): ${foreign.length}`,
    `**bad_chars: ${badChars.length}** (a quote or bracket, a character outside the safe set, a double space or a hyphen at the edge of a word in the title, keyword or description; never written)${badChars.length ? ":" : ""}`,
    ...(badChars.length ? [`- by kind: ${[...kinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} x${n}`).join(", ")}`] : []),
    ...badChars.slice(0, 25).map(({ product, result }) => `- ${product.slug}: ${result.badChars.join("; ")}`),
    ...(badChars.length > 25 ? [`- … ${badChars.length - 25} more (column bad_chars in apply-preview.csv)`] : []),
    `**spec_zero: ${zeroSpec.length}** (a description spec value that is zero or empty, e.g. "0GB storage"; never written)${zeroSpec.length ? ":" : ""}`,
    ...zeroSpec.slice(0, 25).map(({ product, result }) => `- ${product.slug}: ${result.zeroSpecs.join("; ")}`),
    `**claim_conflict: ${conflicts.length}** (a form factor in the description that the raw name contradicts; never written)${conflicts.length ? ":" : ""}`,
    ...list(conflicts, ({ product, result }) => `- ${product.slug}: ${result.claimConflicts.join("; ")}`),
    `**bad_spec_phrase: ${badSpec.length}** (machine-looking wording: "8GB size", "6.57 inch, 6.57 inches", one quantity in two phrases; never written)${badSpec.length ? ":" : ""}`,
    ...list(badSpec, ({ product, result }) => `- ${product.slug}: ${result.badSpecPhrases.join("; ")}`),
    `**unusable_type: ${noType.length}** (the category is only a bucket such as "Mobile Accessory" and the name states no product type; never written)${noType.length ? ":" : ""}`,
    ...list(noType, ({ product, chain }) => `- ${product.slug} (${chain[0] ?? "no category"}): ${product.name.slice(0, 70)}`),
    `**unsupported_claim: ${claimDropped.length}** row(s) had a claim removed because neither the name nor a trusted spec row backs it${claimDropped.length ? ` (${[...claimKinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} x${n}`).join(", ")}); ${claimSkipped} of them are now skipped: too few specs left` : ""}${claimDropped.length ? ":" : ""}`,
    ...list(claimDropped, ({ product, result, decision }) => `- ${product.slug}: ${result.unsupportedClaims.join(", ")} removed -> ${decision.action}`),
    ...(generatedRows.length
      ? [
          `Rows that already have generated text: ${generatedRows.length} -> ${refreshCount("update")} update, ${refreshCount("unchanged")} unchanged, ${stale.length} blocked (the new text is not written and the OLD generated text stays live)${stale.length ? ":" : ""}`,
          ...list(stale, ({ product, decision }) => `- ${product.slug}: ${decision.action}`),
        ]
      : []),
    `Titles with no "Price in …" suffix (model core + type only, nothing dropped from the core): ${noSuffix}`, "",
    `Alts to change (--apply-alts ${APPLY_ALTS ? "ON" : "off"}): ${rows.filter((r) => r.alt).length}`, "",
    "Review: apply-preview.csv (current vs new title, description, keyword, flags, collision group).",
  ];
  await writeFile(path.join(OUT, "apply-summary.md"), `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
}

async function saveBackup(rows) {
  const dir = path.join(OUT, "backups");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `product-seo-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const payload = {
    kind: "product-seo", database: databaseName(), createdAt: new Date().toISOString(),
    rows: rows.map(({ product, result, alt, decision }) => ({
      id: product.id, slug: product.slug,
      // false = only the image alt of this product is touched.
      meta: decision.write,
      before: { metaTitle: product.metaTitle, metaDescription: product.metaDescription, seoKeyword: product.seoKeyword, seoSource: product.seoSource, seoGeneratedAt: product.seoGeneratedAt },
      after: { metaTitle: result.title, metaDescription: result.metaDescription, seoKeyword: result.primaryKeyword, seoSource: "generated" },
      alt: alt ? { imageId: alt.imageId, before: alt.before, after: alt.after } : null,
    })),
  };
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`backup: ${file} (${payload.rows.length} rows)`);
  return file;
}

async function applyRows(prisma, rows) {
  requireConfirmedDb();
  const toWrite = rowsToWrite(rows);
  if (toWrite.length === 0) {
    console.log("nothing to write");
    return;
  }
  await saveBackup(toWrite);
  const now = new Date();
  for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
    const batch = toWrite.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.flatMap(({ product, result, alt, decision }) => [
        ...(decision.write
          ? [prisma.product.update({
              where: { id: product.id },
              data: { metaTitle: result.title, metaDescription: result.metaDescription, seoKeyword: result.primaryKeyword, seoSource: "generated", seoGeneratedAt: now },
            })]
          : []),
        ...(alt ? [prisma.productImage.update({ where: { id: alt.imageId }, data: { alt: alt.after } })] : []),
      ]),
    );
    console.log(`written ${Math.min(i + BATCH_SIZE, toWrite.length)}/${toWrite.length}`);
  }
}

async function restore(prisma) {
  requireConfirmedDb();
  const backup = JSON.parse(await readFile(path.resolve(RESTORE), "utf8"));
  if (backup.kind !== "product-seo") throw new Error("Not a product-seo backup.");
  if (backup.database !== databaseName()) throw new Error(`Backup is from "${backup.database}", this is "${databaseName()}".`);
  const current = new Map(
    (await prisma.product.findMany({ where: { id: { in: backup.rows.map((r) => r.id) } }, select: { id: true, metaTitle: true, metaDescription: true } })).map((p) => [p.id, p]),
  );
  const imageIds = backup.rows.flatMap((r) => (r.alt ? [r.alt.imageId] : []));
  const currentAlt = new Map(
    (await prisma.productImage.findMany({ where: { id: { in: imageIds } }, select: { id: true, alt: true } })).map((i) => [i.id, i.alt]),
  );
  const skipped = [];
  const todo = backup.rows.filter((row) => {
    const now = current.get(row.id);
    if (!now) { skipped.push(`${row.slug} (product gone)`); return false; }
    // A row edited after the apply (by hand) is not rolled back silently.
    if (row.meta !== false && !FORCE && (squash(now.metaTitle) !== squash(row.after.metaTitle) || squash(now.metaDescription) !== squash(row.after.metaDescription))) {
      skipped.push(`${row.slug} (changed since the apply; use --force)`);
      return false;
    }
    return true;
  }).map((row) => {
    // An alt edited by hand after the apply is left alone.
    const altStillGenerated = row.alt && (FORCE || squash(currentAlt.get(row.alt.imageId)) === squash(row.alt.after));
    if (row.alt && !altStillGenerated) skipped.push(`${row.slug} alt (changed since the apply; use --force)`);
    return { ...row, alt: altStillGenerated ? row.alt : null };
  });
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    await prisma.$transaction(
      todo.slice(i, i + BATCH_SIZE).flatMap((row) => [
        ...(row.meta !== false
          ? [prisma.product.update({ where: { id: row.id }, data: { metaTitle: row.before.metaTitle, metaDescription: row.before.metaDescription, seoKeyword: row.before.seoKeyword, seoSource: row.before.seoSource, seoGeneratedAt: row.before.seoGeneratedAt ? new Date(row.before.seoGeneratedAt) : null } })]
          : []),
        ...(row.alt ? [prisma.productImage.update({ where: { id: row.alt.imageId }, data: { alt: row.alt.before } })] : []),
      ]),
    );
  }
  console.log(`restored ${todo.length} row(s) from ${RESTORE}${skipped.length ? `; skipped ${skipped.length}: ${skipped.slice(0, 10).join(", ")}${skipped.length > 10 ? " …" : ""}` : ""}`);
}

/** What lib/seo/product-seo-batch.ts needs to know about one product (the filter and the funnel share it). */
const candidateOf = ({ product, result }) => ({
  name: product.name,
  priceAmount: product.priceAmount,
  isComingSoon: product.isComingSoon,
  hasRealImage: hasRealImage(product),
  brand: squash(product.brand?.name),
  hasStoredText: Boolean(squash(product.metaTitle) || squash(product.metaDescription)),
  storedSource: product.seoSource ?? null,
  result,
});

/** --explain-filter: write filter-funnel.md and print the top of it. */
async function writeFunnel(funnel) {
  await mkdir(OUT, { recursive: true });
  const md = renderFunnelMarkdown(funnel, {
    database: databaseName(),
    at: new Date().toISOString(),
    minSpecsNote: describeMinSpecs(ARGS).replace(/^minimum specs per description: /, ""),
  });
  const file = path.join(OUT, "filter-funnel.md");
  await writeFile(file, md);
  console.log(topLines(md, 50));
  console.log(`\n... full report (examples per bucket): ${file}`);
}

/** The batch CSV (and its summary) to write: --out=<file>.csv or the next free batch-<N>.csv. Never an existing file. */
async function claimBatchFiles() {
  await mkdir(OUT, { recursive: true });
  const summaryOf = (csv) => `${csv.replace(/\.csv$/i, "")}-summary.md`;
  if (OUT_FILE) {
    for (const file of [OUT_FILE, summaryOf(OUT_FILE)]) {
      if (existsSync(file)) throw new Error(`${file} already exists and is not overwritten. Remove it or choose another --out=<file>.csv.`);
    }
    return { csv: OUT_FILE, summary: summaryOf(OUT_FILE) };
  }
  const n = nextBatchNumber(await readdir(OUT));
  return { csv: path.join(OUT, `batch-${n}.csv`), summary: path.join(OUT, `batch-${n}-summary.md`) };
}

/** Quality filter + weighted round-robin over leaf categories. Read-only. */
async function selectBatch(prisma) {
  const all = await generateAll(prisma);
  const candidates = all.map(candidateOf);
  const funnel = buildFunnel(candidates, MIN_SPECS);
  if (EXPLAIN) await writeFunnel(funnel);
  if (!SELECT) return;
  const eligible = all.filter((_, i) => isSelectable(candidates[i], MIN_SPECS));
  const leaves = new Map();
  for (const entry of eligible) {
    const leaf = entry.chain[0] ?? "(none)";
    const bucket = leaves.get(leaf) ?? { weight: 1, items: [] };
    bucket.weight = Math.max(bucket.weight, entry.result.familyWeight);
    bucket.items.push(entry);
    leaves.set(leaf, bucket);
  }
  for (const bucket of leaves.values()) {
    bucket.items.sort((a, b) =>
      b.result.specsAvailable - a.result.specsAvailable ||
      Number(hasDescription(b.product)) - Number(hasDescription(a.product)) ||
      a.product.slug.localeCompare(b.product.slug));
  }
  const order = [...leaves.entries()].sort((a, b) => b[1].weight - a[1].weight || b[1].items.length - a[1].items.length || a[0].localeCompare(b[0]));
  const picked = [];
  while (picked.length < SELECT_COUNT && order.some(([, bucket]) => bucket.items.length > 0)) {
    for (const [, bucket] of order) {
      for (let n = 0; n < bucket.weight && bucket.items.length > 0 && picked.length < SELECT_COUNT; n += 1) {
        picked.push(bucket.items.shift());
      }
    }
  }
  const files = await claimBatchFiles();
  const rows = picked.map(({ product, result, chain }) => ({
    id: product.id, slug: product.slug, name: product.name, leaf_category: chain[0] ?? "", family: result.family,
    weight: result.familyWeight, specs_available: result.specsAvailable, has_description: hasDescription(product),
    new_title: result.title, new_meta_description: result.metaDescription, keyword: result.primaryKeyword,
  }));
  await writeCsv(files.csv, ["id", "slug", "name", "leaf_category", "family", "weight", "specs_available", "has_description", "new_title", "new_meta_description", "keyword"], rows, { exclusive: true });
  const perCategory = new Map();
  const perFamily = new Map();
  for (const row of rows) {
    perCategory.set(row.leaf_category, (perCategory.get(row.leaf_category) ?? 0) + 1);
    perFamily.set(row.family, (perFamily.get(row.family) ?? 0) + 1);
  }
  const blocker = biggestBlocker(funnel);
  const lines = [
    `# Batch selection`, "",
    `Database: ${databaseName()} · ${new Date().toISOString()}`,
    describeMinSpecs(ARGS),
    `Active products ${all.length}; ${funnel.withStoredText} already have stored text (never selected); of the other ${funnel.total}, ${eligible.length} pass the quality filter (price > 0, real image, real brand, usable type, >= ${MIN_SPECS} spec${MIN_SPECS === 1 ? "" : "s"}, resolved unique title, no gate flag, valid lengths; stock ignored).`,
    `Selected ${rows.length} of the ${SELECT_COUNT} requested across ${perCategory.size} leaf categories (${leaves.size} had eligible products).`,
    ...(rows.length < SELECT_COUNT && blocker
      ? [`Fewer than requested: the biggest blocker is "${blocker.label}" (${blocker.removed} of ${funnel.total} removed there). Run with --explain-filter for the whole funnel.`]
      : []),
    "",
    "| family | picked |", "|---|---|",
    ...[...perFamily.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => `| ${name} | ${n} |`), "",
    "| leaf category | weight | eligible | picked |", "|---|---|---|---|",
    ...[...perCategory.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, n]) => `| ${name} | ${leaves.get(name)?.weight ?? 1} | ${eligible.filter((e) => (e.chain[0] ?? "(none)") === name).length} | ${n} |`), "",
    `File: ${files.csv}`,
  ];
  await writeFile(files.summary, `${lines.join("\n")}\n`, { flag: "wx" });
  console.log(lines.join("\n"));
  console.log(`\nwrote ${files.csv}`);
}

async function main() {
  const live = getPrisma();
  const writing = APPLY || Boolean(RESTORE);
  const prisma = writing ? live : readOnly(live);
  const mode = RESTORE ? "RESTORE" : APPLY ? "APPLY" : SELECT ? "SELECT BATCH (read-only)" : EXPLAIN ? "EXPLAIN FILTER (read-only)" : "DRY RUN (nothing is changed)";
  console.log(`database: ${databaseName()} — ${mode}`);
  if (RESTORE) return restore(prisma);
  if (SELECT || EXPLAIN) return selectBatch(prisma);
  const { rows, limit } = await plan(prisma);
  await writePreview(rows, limit);
  if (APPLY) await applyRows(prisma, rows);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

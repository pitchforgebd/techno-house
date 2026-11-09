#!/usr/bin/env node
/**
 * Catalogue text report and (only on request) fixer — SEO phase 5.
 *
 *   npx tsx scripts/fix-catalog-text.mjs
 *       DRY RUN (default): reads the database, writes the reports, changes nothing.
 *   npx tsx scripts/fix-catalog-text.mjs --apply --fix=names --confirm-db=<database name>
 *       --fix is one of names | alts | slugs. Saves a JSON backup first.
 *   npx tsx scripts/fix-catalog-text.mjs --restore=<backup.json> --confirm-db=<database name>
 *       Puts the backed-up values back.
 *
 * Options: --name-rules=smat_watch,ryzen_ai,...   limit the name rules
 *          --slug-reason=copy                     with --fix=slugs: only copy or truncated_mid_word
 *          --out=docs/seo-reports                 report/backup folder
 *
 * Reports (one CSV per fix type, active products/banners only):
 *   product-names.csv, image-alts.csv, slugs.csv, duplicates.csv,
 *   slug-redirects.proposed.json (old -> new), summary.md
 *
 * Duplicates are report-only: nothing here deletes or merges a listing.
 * --fix=slugs refuses to run unless every change is already in
 * lib/seo/slug-redirects.json, so a renamed product never loses its old URL.
 * Run with tsx (it imports the site's TypeScript rules and database client).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnvFiles } from "dotenv";
import { isJunkAlt } from "@/lib/content/alt-text";
import { NAME_RULES, fixProductName, proposeSlug, slugIssue } from "@/lib/catalog/text-fixes";
import { getPrisma } from "@/lib/db/prisma";
import { cleanProductName, cutAtWord, productTitle } from "@/lib/seo/page-meta";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

const arg = (name) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const APPLY = process.argv.includes("--apply");
const FIX = arg("fix");
const RESTORE = arg("restore");
const CONFIRM_DB = arg("confirm-db");
const OUT = path.resolve(arg("out") ?? "docs/seo-reports");
const ALT_MAX = 125;

const nameRules = arg("name-rules") ? arg("name-rules").split(",") : [...NAME_RULES];
for (const rule of nameRules) {
  if (!NAME_RULES.includes(rule)) {
    throw new Error(`Unknown name rule: ${rule}. Valid: ${NAME_RULES.join(", ")}`);
  }
}

const databaseName = () => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

async function writeCsv(file, header, rows) {
  const lines = [header.join(","), ...rows.map((row) => header.map((key) => csvCell(row[key])).join(","))];
  // BOM so Excel reads Bangla and ৳ correctly.
  await writeFile(path.join(OUT, file), `﻿${lines.join("\r\n")}\r\n`, "utf8");
}

async function buildReports(prisma) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      brand: { select: { name: true } },
      images: { select: { id: true, alt: true, src: true } },
      colors: { select: { images: { select: { id: true, alt: true, src: true } } } },
    },
  });

  // 1. Names
  const names = [];
  const fixedName = new Map();
  for (const product of products) {
    const fixed = fixProductName(product.name, nameRules);
    fixedName.set(product.id, fixed.name);
    if (fixed.rules.length > 0) {
      names.push({ id: product.id, slug: product.slug, rules: fixed.rules.join("+"), old_name: product.name, new_name: fixed.name });
    }
  }

  // 2. Alts
  const alts = [];
  const productAlt = (product) =>
    cutAtWord(cleanProductName(fixedName.get(product.id), product.brand.name).clean, ALT_MAX);
  for (const product of products) {
    const proposed = productAlt(product);
    const push = (table, image) => {
      if (isJunkAlt(image.alt)) {
        alts.push({ table, id: image.id, where: `/product/${product.slug}`, title: product.name, old_alt: image.alt, new_alt: proposed, status: isJunkAlt(proposed) ? "needs_manual" : "proposed" });
      }
    };
    product.images.forEach((image) => push("ProductImage", image));
    product.colors.forEach((color) => color.images.forEach((image) => push("ProductColorImage", image)));
  }
  const banners = await prisma.homeBanner.findMany({
    where: { isActive: true },
    select: { id: true, slot: true, title: true, eyebrow: true, imageAlt: true },
  });
  for (const banner of banners) {
    if (isJunkAlt(banner.imageAlt)) {
      const source = [banner.title, banner.eyebrow].find((text) => !isJunkAlt(text));
      alts.push({ table: "HomeBanner", id: banner.id, where: `banner:${banner.slot}`, title: banner.title, old_alt: banner.imageAlt, new_alt: source?.trim() ?? "", status: source ? "proposed" : "needs_manual" });
    }
  }

  // 3. Slugs — every slug in the table is "taken", active or not.
  const allSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((row) => row.slug));
  const slugs = [];
  for (const product of products) {
    const issue = slugIssue(product.slug, product.name);
    if (!issue) continue;
    const proposal = proposeSlug(product.slug, product.name, allSlugs);
    if (proposal) allSlugs.add(proposal);
    slugs.push({ id: product.id, reason: issue, name: product.name, old_slug: product.slug, new_slug: proposal ?? "", status: proposal ? "proposed" : "needs_manual" });
  }

  // 4. Duplicates — the same cleaned title the storefront would show.
  const siblings = new Map();
  for (const product of products) {
    siblings.set(product.brand.name, [...(siblings.get(product.brand.name) ?? []), product.name]);
  }
  const byTitle = new Map();
  for (const product of products) {
    const title = productTitle(product.name, product.brand.name, siblings.get(product.brand.name));
    byTitle.set(title, [...(byTitle.get(title) ?? []), product]);
  }
  const duplicates = [];
  let group = 0;
  for (const [title, list] of byTitle) {
    if (list.length < 2) continue;
    group += 1;
    for (const product of list) {
      duplicates.push({ group, cleaned_title: title, id: product.id, slug: product.slug, name: product.name });
    }
  }
  return { products: products.length, names, alts, slugs, duplicates, duplicateGroups: group };
}

async function writeReports(report) {
  await mkdir(OUT, { recursive: true });
  await writeCsv("product-names.csv", ["id", "slug", "rules", "old_name", "new_name"], report.names);
  await writeCsv("image-alts.csv", ["table", "id", "where", "title", "old_alt", "new_alt", "status"], report.alts);
  await writeCsv("slugs.csv", ["id", "reason", "name", "old_slug", "new_slug", "status"], report.slugs);
  await writeCsv("duplicates.csv", ["group", "cleaned_title", "id", "slug", "name"], report.duplicates);
  const map = Object.fromEntries(
    report.slugs
      .filter((row) => row.status === "proposed" && (!arg("slug-reason") || row.reason === arg("slug-reason")))
      .map((row) => [row.old_slug, row.new_slug]),
  );
  await writeFile(path.join(OUT, "slug-redirects.proposed.json"), `${JSON.stringify(map, null, 2)}\n`);

  const byRule = {};
  for (const row of report.names) for (const rule of row.rules.split("+")) byRule[rule] = (byRule[rule] ?? 0) + 1;
  const count = (rows, key, value) => rows.filter((row) => row[key] === value).length;
  const lines = [
    `# Catalogue text report`,
    ``,
    `Database: \`${databaseName()}\` — generated ${new Date().toISOString()} — ${report.products} active products.`,
    `Dry-run report: nothing was changed.`,
    ``,
    `| Fix type | Rows | Detail |`,
    `|---|---|---|`,
    `| Product names | ${report.names.length} | ${Object.entries(byRule).map(([rule, n]) => `${rule}: ${n}`).join(", ") || "none"} |`,
    `| Image alts | ${report.alts.length} | proposed: ${count(report.alts, "status", "proposed")}, needs manual: ${count(report.alts, "status", "needs_manual")} |`,
    `| Slugs | ${report.slugs.length} | copy: ${count(report.slugs, "reason", "copy")}, truncated: ${count(report.slugs, "reason", "truncated_mid_word")}, needs manual: ${count(report.slugs, "status", "needs_manual")} |`,
    `| Duplicate listings (report only) | ${report.duplicates.length} products | ${report.duplicateGroups} groups |`,
    ``,
  ];
  await writeFile(path.join(OUT, "summary.md"), lines.join("\n"));
  console.log(lines.join("\n"));
}

function requireConfirmedDb() {
  const actual = databaseName();
  if (!CONFIRM_DB || CONFIRM_DB !== actual) {
    throw new Error(`Refusing to write: pass --confirm-db=${actual || "<database name>"} to confirm the target database.`);
  }
}

/** Reads the current values, then writes the backup BEFORE any change. */
async function saveBackup(fix, rows) {
  const dir = path.join(OUT, "backups");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${fix}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(file, `${JSON.stringify({ fix, database: databaseName(), rows }, null, 2)}\n`);
  console.log(`backup: ${file} (${rows.length} rows)`);
  return file;
}

const updateRow = (prisma, row, value) => {
  const model = { Product: prisma.product, ProductImage: prisma.productImage, ProductColorImage: prisma.productColorImage, HomeBanner: prisma.homeBanner }[row.table];
  return model.update({ where: { id: row.id }, data: { [row.column]: value } });
};

function plannedChanges(fix, report) {
  if (fix === "names") {
    return report.names.map((row) => ({ table: "Product", id: row.id, column: "name", old: row.old_name, new: row.new_name }));
  }
  if (fix === "alts") {
    return report.alts
      .filter((row) => row.status === "proposed")
      .map((row) => ({ table: row.table, id: row.id, column: row.table === "HomeBanner" ? "imageAlt" : "alt", old: row.old_alt, new: row.new_alt }));
  }
  return report.slugs
    .filter((row) => row.status === "proposed" && (!arg("slug-reason") || row.reason === arg("slug-reason")))
    .map((row) => ({ table: "Product", id: row.id, column: "slug", old: row.old_slug, new: row.new_slug }));
}

async function assertRedirectsDeployed(changes) {
  const map = JSON.parse(await readFile(path.resolve("lib/seo/slug-redirects.json"), "utf8"));
  const missing = changes.filter((change) => map[change.old] !== change.new);
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} slug change(s) are not in lib/seo/slug-redirects.json (first: ${missing[0].old}). ` +
        `Add docs/seo-reports/slug-redirects.proposed.json to it and deploy first, or the old URLs would 404.`,
    );
  }
}

async function apply(prisma, report) {
  if (!["names", "alts", "slugs"].includes(FIX)) {
    throw new Error("--apply needs --fix=names, --fix=alts or --fix=slugs (one at a time).");
  }
  requireConfirmedDb();
  const changes = plannedChanges(FIX, report);
  if (FIX === "slugs") {
    await assertRedirectsDeployed(changes);
  }
  if (changes.length === 0) {
    console.log("nothing to change");
    return;
  }
  await saveBackup(FIX, changes);
  await prisma.$transaction(changes.map((change) => updateRow(prisma, change, change.new)), { timeout: 300_000 });
  console.log(`applied ${changes.length} ${FIX} change(s) in one transaction`);
}

async function restore(prisma) {
  requireConfirmedDb();
  const backup = JSON.parse(await readFile(path.resolve(RESTORE), "utf8"));
  if (backup.database !== databaseName()) {
    throw new Error(`Backup is from "${backup.database}", this is "${databaseName()}".`);
  }
  await prisma.$transaction(backup.rows.map((row) => updateRow(prisma, row, row.old)), { timeout: 300_000 });
  console.log(`restored ${backup.rows.length} row(s) from ${RESTORE}`);
}

async function main() {
  const prisma = getPrisma();
  console.log(`database: ${databaseName()} — ${RESTORE ? "RESTORE" : APPLY ? `APPLY ${FIX}` : "DRY RUN (nothing is changed)"}`);
  if (RESTORE) {
    await restore(prisma);
    return;
  }
  const report = await buildReports(prisma);
  await writeReports(report);
  if (APPLY) {
    await apply(prisma, report);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

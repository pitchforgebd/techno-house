#!/usr/bin/env node
/**
 * Seed the eight trust pages (about, contact, shipping, returns, warranty,
 * terms, privacy, faq) into ContentPage from docs/SITE-PAGES-CONTENT.md —
 * SEO phase 6.
 *
 *   npx tsx scripts/seed-trust-pages.mjs
 *       DRY RUN (default): reads the database and the content file, writes a
 *       preview of every page and a summary, changes nothing.
 *   npx tsx scripts/seed-trust-pages.mjs --apply --confirm-db=<database name>
 *       Writes the pages. Saves a JSON backup of the current rows first and
 *       writes everything in one transaction.
 *   npx tsx scripts/seed-trust-pages.mjs --restore=<backup.json> --confirm-db=<database name>
 *       Puts the backed-up rows back (a page that had no row is deleted again).
 *
 * Options: --only=faq,shipping   limit to these pages
 *          --overwrite           also replace a page whose body is NOT empty
 *                                and differs (an admin may have written it);
 *                                without it those pages are skipped
 *          --out=docs/seo-reports/trust-pages   preview / backup folder
 *
 * Only the eight slugs above are ever touched; metaKeywords is left as it is.
 * Bodies hold `{{tokens}}` for every policy value (lib/site/policies.ts);
 * the storefront fills them in at render time. The script refuses to write
 * if a policy value is still spelled out in the content file or a token is
 * unknown, and if the HTML sanitizer would drop any of the generated markup.
 * Run with tsx (it imports the site's TypeScript and database client).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnvFiles } from "dotenv";
import { sanitizeBlogBody } from "@/lib/content/sanitize-html";
import { getPrisma } from "@/lib/db/prisma";
import { fillPolicyTokens, fillPolicyTokensText } from "@/lib/site/policies";
import {
  TRUST_PAGE_SLUGS,
  buildTrustPageRecord,
  parseTrustPages,
} from "@/lib/site/trust-pages-markdown";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

const arg = (name) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const APPLY = process.argv.includes("--apply");
const OVERWRITE = process.argv.includes("--overwrite");
const RESTORE = arg("restore");
const CONFIRM_DB = arg("confirm-db");
const OUT = path.resolve(arg("out") ?? "docs/seo-reports/trust-pages");
const CONTENT_FILE = path.resolve("docs/SITE-PAGES-CONTENT.md");
const BODY_MAX = 20000; // lib/content/pages.ts BODY_MAX
const TITLE_MAX = 150;
const META_DESC_MAX = 300;

const ONLY = arg("only") ? arg("only").split(",").map((slug) => slug.trim()) : [...TRUST_PAGE_SLUGS];
for (const slug of ONLY) {
  if (!TRUST_PAGE_SLUGS.includes(slug)) {
    throw new Error(`Unknown page: ${slug}. Valid: ${TRUST_PAGE_SLUGS.join(", ")}`);
  }
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

/** Text a reader sees, for "did the sanitizer drop anything" comparisons. */
const plainText = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const tagCounts = (html) =>
  JSON.stringify(
    [...html.matchAll(/<([a-z0-9]+)[\s>]/gi)].reduce((acc, [, tag]) => {
      acc[tag.toLowerCase()] = (acc[tag.toLowerCase()] ?? 0) + 1;
      return acc;
    }, {}),
  );

/** The rows to write, built from the content file and checked before anything else happens. */
async function plannedPages() {
  const source = parseTrustPages(await readFile(CONTENT_FILE, "utf8"));
  return source
    .filter((page) => ONLY.includes(page.slug))
    .map((page) => {
      const record = buildTrustPageRecord(page);
      // What the admin "Save" would store, so the stored body is already clean.
      const body = sanitizeBlogBody(record.body);
      if (plainText(body) !== plainText(record.body) || tagCounts(body) !== tagCounts(record.body)) {
        throw new Error(`/${page.slug}: the HTML sanitizer changed the generated markup; refusing to continue.`);
      }
      if (body.length > BODY_MAX) {
        throw new Error(`/${page.slug}: body is ${body.length} characters (max ${BODY_MAX}).`);
      }
      if (record.title.length > TITLE_MAX || record.metaTitle.length > TITLE_MAX || record.metaDescription.length > META_DESC_MAX) {
        throw new Error(`/${page.slug}: title or meta text is longer than the admin form allows.`);
      }
      return { ...record, body };
    });
}

function decide(page, row) {
  if (!row) return "create";
  const same =
    row.title === page.title &&
    row.body === page.body &&
    (row.metaTitle ?? "") === page.metaTitle &&
    (row.metaDescription ?? "") === page.metaDescription;
  if (same) return "unchanged";
  if (!row.body.trim()) return "update (body was empty)";
  return OVERWRITE ? "overwrite (--overwrite)" : "SKIP: has its own body (use --overwrite)";
}

async function writePreviews(pages, rows) {
  await mkdir(OUT, { recursive: true });
  const lines = [
    `# Trust pages seed — ${APPLY ? "APPLY" : "DRY RUN"}`,
    "",
    `Database: ${databaseName()}  `,
    `Content file: docs/SITE-PAGES-CONTENT.md  `,
    `Generated: ${new Date().toISOString()}`,
    "",
    "| page | action | current title | current body chars | new body chars |",
    "|---|---|---|---|---|",
  ];
  for (const page of pages) {
    const row = rows.get(page.slug);
    lines.push(`| /${page.slug} | ${decide(page, row)} | ${row?.title ?? "(no row)"} | ${row?.body.length ?? 0} | ${page.body.length} |`);
    // Preview with tokens filled, as the storefront will render it.
    const preview = [
      "<!doctype html><meta charset=utf-8>",
      `<title>${fillPolicyTokensText(page.metaTitle)}</title>`,
      `<meta name=description content="${fillPolicyTokensText(page.metaDescription).replace(/"/g, "&quot;")}">`,
      `<h1>${page.title}</h1>`,
      sanitizeBlogBody(fillPolicyTokens(page.body, { googleMapsUrl: "https://maps.app.goo.gl/(map link from Business Settings)" })),
    ].join("\n");
    await writeFile(path.join(OUT, `${page.slug}.html`), `${preview}\n`);
    await writeFile(path.join(OUT, `${page.slug}.stored.html`), `${page.body}\n`);
  }
  await writeFile(path.join(OUT, "summary.md"), `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
}

/** Reads the current rows, then writes the backup BEFORE any change. */
async function saveBackup(slugs, rows) {
  const dir = path.join(OUT, "backups");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `trust-pages-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const backup = slugs.map((slug) => {
    const row = rows.get(slug);
    return row
      ? { slug, existed: true, title: row.title, body: row.body, metaTitle: row.metaTitle, metaDescription: row.metaDescription }
      : { slug, existed: false };
  });
  await writeFile(file, `${JSON.stringify({ database: databaseName(), rows: backup }, null, 2)}\n`);
  console.log(`backup: ${file} (${backup.length} rows)`);
  return file;
}

async function apply(prisma, pages, rows) {
  requireConfirmedDb();
  const toWrite = pages.filter((page) => {
    const action = decide(page, rows.get(page.slug));
    return action !== "unchanged" && !action.startsWith("SKIP");
  });
  if (toWrite.length === 0) {
    console.log("nothing to change");
    return;
  }
  await saveBackup(toWrite.map((page) => page.slug), rows);
  await prisma.$transaction(
    toWrite.map((page) => {
      const data = {
        title: page.title,
        body: page.body,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
      };
      return prisma.contentPage.upsert({
        where: { slug: page.slug },
        create: { slug: page.slug, ...data, metaKeywords: [] },
        update: data,
      });
    }),
  );
  console.log(`applied ${toWrite.length} page(s) in one transaction: ${toWrite.map((page) => `/${page.slug}`).join(", ")}`);
}

async function restore(prisma) {
  requireConfirmedDb();
  const backup = JSON.parse(await readFile(path.resolve(RESTORE), "utf8"));
  if (backup.database !== databaseName()) {
    throw new Error(`Backup is from "${backup.database}", this is "${databaseName()}".`);
  }
  if (backup.rows.some((row) => !TRUST_PAGE_SLUGS.includes(row.slug))) {
    throw new Error("Backup contains a page this script does not manage; refusing.");
  }
  await prisma.$transaction(
    backup.rows.map((row) =>
      row.existed
        ? prisma.contentPage.update({
            where: { slug: row.slug },
            data: { title: row.title, body: row.body, metaTitle: row.metaTitle, metaDescription: row.metaDescription },
          })
        : prisma.contentPage.deleteMany({ where: { slug: row.slug } }),
    ),
  );
  console.log(`restored ${backup.rows.length} page(s) from ${RESTORE}`);
}

async function main() {
  const prisma = getPrisma();
  console.log(`database: ${databaseName()} — ${RESTORE ? "RESTORE" : APPLY ? "APPLY" : "DRY RUN (nothing is changed)"}`);
  if (RESTORE) {
    await restore(prisma);
    return;
  }
  const pages = await plannedPages();
  const rows = new Map(
    (await prisma.contentPage.findMany({ where: { slug: { in: pages.map((page) => page.slug) } } })).map((row) => [row.slug, row]),
  );
  await writePreviews(pages, rows);
  if (APPLY) {
    await apply(prisma, pages, rows);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

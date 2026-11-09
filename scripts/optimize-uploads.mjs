#!/usr/bin/env node
/**
 * Create WebP copies of uploaded images (SEO phase 4, D3).
 *
 *   node scripts/optimize-uploads.mjs                       # DRY RUN (default): report only
 *   node scripts/optimize-uploads.mjs --apply               # write the .webp copies
 *   node scripts/optimize-uploads.mjs --dir=public/uploads/home --limit=20
 *   node scripts/optimize-uploads.mjs --apply --force       # re-encode even if a copy is newer
 *   node scripts/optimize-uploads.mjs --csv=report.csv      # also write the report as CSV
 *
 * Rules (lib/media/webp-variant.mjs):
 *   - png / jpg / jpeg  → foo.webp next to it; banners (home, general, …) max
 *     1920 px wide, target < 150 KB; product/brand/category images max
 *     1000 px, target < 80 KB.
 *   - webp larger than its target → foo.min.webp; webp already under it → skipped.
 *   - svg, gif, pdf, … and the script's own outputs → skipped.
 *   - a copy that would not save at least 10% is not written.
 *   - ORIGINALS ARE NEVER MODIFIED, MOVED OR DELETED.
 * nginx then serves the copy in the original's place (deploy/nginx-seo.conf),
 * so no database row or URL changes. Runs with one sharp thread and
 * low-ish encoding effort to stay gentle on a small server.
 */
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { processFile } from "../lib/media/webp-variant.mjs";

const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const DIR = path.resolve(arg("dir") ?? "public/uploads");
const LIMIT = Number(arg("limit") ?? Infinity);
const CSV = arg("csv");

sharp.concurrency(1);
sharp.cache(false);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

console.log(`${APPLY ? "APPLY" : "DRY RUN (nothing is written — add --apply)"} — ${DIR}`);
const rows = [];
let seen = 0;
for await (const file of walk(DIR)) {
  if (seen >= LIMIT) {
    break;
  }
  const ext = path.extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    continue;
  }
  seen += 1;
  const result = await processFile(sharp, file, { apply: APPLY, force: FORCE });
  rows.push(result);
  const rel = path.relative(DIR, file);
  if (result.action === "write") {
    const saved = 1 - result.after / result.before;
    console.log(
      `${APPLY ? "WROTE" : "WOULD"}  ${rel}  ${kb(result.before)} → ${kb(result.after)} (−${(saved * 100).toFixed(0)}%, q${result.quality}, ${result.width}px)  → ${path.basename(result.variant)}`,
    );
  } else {
    console.log(`skip   ${rel}  ${kb(result.before)}  — ${result.reason}`);
  }
}

const writes = rows.filter((row) => row.action === "write");
const before = writes.reduce((sum, row) => sum + row.before, 0);
const after = writes.reduce((sum, row) => sum + row.after, 0);
console.log("\n— summary —");
console.log(`files checked:        ${rows.length}`);
console.log(`copies ${APPLY ? "written" : "to write"}:      ${writes.length}`);
console.log(`skipped:              ${rows.length - writes.length}`);
console.log(`bytes served for those images: ${kb(before)} → ${kb(after)}${before ? ` (−${((1 - after / before) * 100).toFixed(0)}%)` : ""}`);
if (!APPLY) {
  console.log("\nDry run only. Re-run with --apply to write the copies (originals are never changed).");
}

if (CSV) {
  const esc = (value) => (/[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value));
  const lines = ["file,action,reason,before_bytes,after_bytes,quality,width,variant"];
  for (const row of rows) {
    lines.push([path.relative(DIR, row.file), row.action, row.reason, row.before, row.after, row.quality ?? "", row.width ?? "", row.variant ? path.basename(row.variant) : ""].map(esc).join(","));
  }
  await writeFile(CSV, `${lines.join("\n")}\n`);
  console.log(`report: ${CSV}`);
}

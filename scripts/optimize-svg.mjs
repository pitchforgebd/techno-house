#!/usr/bin/env node
/**
 * Optimize uploaded SVGs with SVGO (SEO phase 4, D4).
 *
 *   node scripts/optimize-svg.mjs                         # DRY RUN (default): report only
 *   node scripts/optimize-svg.mjs --apply                 # write foo.min.svg next to foo.svg
 *   node scripts/optimize-svg.mjs --dir=public/uploads/general
 *   node scripts/optimize-svg.mjs --apply --embedded-webp # also re-encode embedded bitmaps
 *
 *   - Output is ALWAYS foo.min.svg next to foo.svg. The original is never
 *     modified, moved or deleted. nginx serves foo.min.svg in place of foo.svg
 *     (deploy/nginx-seo.conf), so the stored URL does not change.
 *   - --embedded-webp: many "SVG" uploads are really PNG/JPEG pictures wrapped in
 *     SVG (base64 <image> data). SVGO cannot shrink those; this flag
 *     re-encodes each embedded PNG/JPEG as WebP (quality 82, alpha kept) inside
 *     the copy. Browsers render WebP inside an SVG <img> the same way.
 *   - A copy is only written when it is at least 10% smaller.
 *   - SVGO runs with a conservative config (see SAFE_OVERRIDES). Still open the
 *     .min.svg next to the original once after --apply before relying on it.
 */
import { readdir, readFile, stat, writeFile, rename, chmod } from "node:fs/promises";
import path from "node:path";
import { optimize } from "svgo";

const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const APPLY = process.argv.includes("--apply");
const EMBEDDED = process.argv.includes("--embedded-webp");
const DIR = path.resolve(arg("dir") ?? "public/uploads");
const MIN_SAVING = 0.1;

/**
 * Conservative SVGO: the default preset broke the live payment-methods SVG
 * (3 of 18 logos vanished — it styles clip-paths through <style> classes and
 * ids, which cleanupIds / inlineStyles / minifyStyles rewrite). Checked in
 * Chrome: with these plugins off the output renders identically. Do not turn
 * them back on without a visual check of the result.
 */
const SAFE_OVERRIDES = {
  cleanupIds: false,
  inlineStyles: false,
  minifyStyles: false,
  mergePaths: false,
  removeHiddenElems: false,
  convertShapeToPath: false,
  collapseGroups: false,
};

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function reencodeEmbedded(svg) {
  const { default: sharp } = await import("sharp");
  sharp.concurrency(1);
  const pattern = /data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=\s]+)/g;
  let out = "";
  let last = 0;
  let count = 0;
  for (const match of svg.matchAll(pattern)) {
    const original = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    let replacement = match[0];
    try {
      const webp = await sharp(original).webp({ quality: 82, alphaQuality: 90, effort: 4 }).toBuffer();
      if (webp.length < original.length) {
        replacement = `data:image/webp;base64,${webp.toString("base64")}`;
        count += 1;
      }
    } catch {
      // Unreadable bitmap: keep it as it is.
    }
    out += svg.slice(last, match.index) + replacement;
    last = match.index + match[0].length;
  }
  return { svg: out + svg.slice(last), count };
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
console.log(`${APPLY ? "APPLY" : "DRY RUN (nothing is written — add --apply)"}${EMBEDDED ? " + embedded bitmaps → WebP" : ""} — ${DIR}`);
let total = { before: 0, after: 0, files: 0 };
for await (const file of walk(DIR)) {
  if (!file.toLowerCase().endsWith(".svg") || file.toLowerCase().endsWith(".min.svg")) {
    continue;
  }
  const rel = path.relative(DIR, file);
  const source = await readFile(file, "utf8");
  const before = Buffer.byteLength(source);
  let svg = optimize(source, {
    path: file,
    multipass: true,
    plugins: [{ name: "preset-default", params: { overrides: SAFE_OVERRIDES } }],
  }).data;
  let embedded = 0;
  if (EMBEDDED) {
    const result = await reencodeEmbedded(svg);
    svg = result.svg;
    embedded = result.count;
  }
  const after = Buffer.byteLength(svg);
  const target = file.replace(/\.svg$/i, ".min.svg");
  if (after > before * (1 - MIN_SAVING)) {
    console.log(`skip   ${rel}  ${kb(before)} → ${kb(after)} — saving under 10%`);
    continue;
  }
  total = { before: total.before + before, after: total.after + after, files: total.files + 1 };
  console.log(`${APPLY ? "WROTE" : "WOULD"}  ${rel}  ${kb(before)} → ${kb(after)} (−${((1 - after / before) * 100).toFixed(0)}%${EMBEDDED ? `, ${embedded} embedded bitmaps → WebP` : ""})  → ${path.basename(target)}`);
  if (APPLY) {
    const existing = await stat(target).catch(() => null);
    if (existing) {
      console.log(`       (replacing previous ${path.basename(target)})`);
    }
    const tmp = `${target}.tmp-${process.pid}`;
    await writeFile(tmp, svg);
    await chmod(tmp, 0o644);
    await rename(tmp, target);
  }
}
console.log(`\n${total.files} file(s): ${kb(total.before)} → ${kb(total.after)}${APPLY ? "" : "  (dry run — add --apply to write .min.svg copies)"}`);

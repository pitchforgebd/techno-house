/**
 * WebP variants for uploaded images (SEO phase 4, D3). Shared by the CLI
 * (`scripts/optimize-uploads.mjs`) and the admin upload handler
 * (`lib/media/admin-media.ts`), so both name and size files the same way.
 *
 * Originals are NEVER modified or deleted. A variant is written next to the
 * original, and nginx serves it in place of the original
 * (deploy/nginx-seo.conf), so no database row or URL changes:
 *
 *   foo.png / foo.jpg / foo.jpeg  →  foo.webp      (served to browsers that
 *                                                   accept image/webp)
 *   foo.webp (too large)          →  foo.min.webp  (served instead of foo.webp)
 *
 * Plain ESM JavaScript (types in webp-variant.d.mts) so the Node script can
 * import it without a TypeScript toolchain.
 */
import { rename, stat, writeFile, chmod, unlink } from "node:fs/promises";
import path from "node:path";

/** Banner-type folders: big hero/promo art. Everything else: product-sized. */
const BANNER_FOLDERS = new Set(["home", "banners", "general", "sliders", "popups", "blog", "offers", "promotions"]);

export const RULES = {
  banner: { maxWidth: 1920, targetBytes: 150 * 1024 },
  product: { maxWidth: 1000, targetBytes: 80 * 1024 },
};

const QUALITIES = [80, 72, 64, 56, 50];
/** A variant must save at least this much, or it is not worth serving. */
const MIN_SAVING = 0.1;

/** Size rules for a file, from its folder under /uploads. */
export function rulesFor(filePath) {
  const parts = filePath.split(/[\\/]/);
  const uploadsAt = parts.lastIndexOf("uploads");
  const folder = uploadsAt >= 0 ? parts[uploadsAt + 1] : parts[parts.length - 2];
  return BANNER_FOLDERS.has(String(folder).toLowerCase()) ? { kind: "banner", ...RULES.banner } : { kind: "product", ...RULES.product };
}

/** Where the variant for `filePath` goes, or null when it gets none. */
export function variantPathFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = filePath.slice(0, -ext.length);
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    return `${base}.webp`;
  }
  if (ext === ".webp" && !base.endsWith(".min")) {
    return `${base}.min.webp`;
  }
  return null;
}

async function exists(file) {
  try {
    return await stat(file);
  } catch {
    return null;
  }
}

/**
 * True when `filePath` is itself a variant written by this module (foo.webp
 * next to foo.png, or foo.min.webp) — those are never processed again.
 */
export async function isVariantFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".webp") {
    return false;
  }
  const base = filePath.slice(0, -ext.length);
  if (base.endsWith(".min")) {
    return true;
  }
  for (const original of [".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG"]) {
    if (await exists(`${base}${original}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Encode `input` as WebP within the rules: resize down to maxWidth (never
 * up), then the highest quality from QUALITIES that meets targetBytes, else
 * the smallest attempt.
 */
export async function encodeWebp(sharp, input, rules) {
  const image = sharp(input, { limitInputPixels: 100_000_000 }).rotate();
  const meta = await image.metadata();
  const resize = meta.width && meta.width > rules.maxWidth ? { width: rules.maxWidth, withoutEnlargement: true } : null;
  let best = null;
  for (const quality of QUALITIES) {
    let pipeline = sharp(input, { limitInputPixels: 100_000_000 }).rotate();
    if (resize) {
      pipeline = pipeline.resize(resize);
    }
    const buffer = await pipeline.webp({ quality, effort: 4, smartSubsample: true }).toBuffer();
    if (!best || buffer.length < best.buffer.length) {
      best = { buffer, quality };
    }
    if (buffer.length <= rules.targetBytes) {
      best = { buffer, quality };
      break;
    }
  }
  return {
    ...best,
    width: resize ? rules.maxWidth : (meta.width ?? 0),
    originalWidth: meta.width ?? 0,
  };
}

/**
 * Plan (and with `apply`, write) the variant for one file.
 * Returns { file, variant, action: "write" | "skip", reason, before, after, quality, width }.
 */
export async function processFile(sharp, filePath, { apply = false, force = false } = {}) {
  const result = { file: filePath, variant: null, action: "skip", reason: "", before: 0, after: 0, quality: null, width: null };
  const ext = path.extname(filePath).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    result.reason = "not png/jpeg/webp";
    return result;
  }
  if (await isVariantFile(filePath)) {
    result.reason = "is a generated variant";
    return result;
  }
  const source = await stat(filePath);
  result.before = source.size;
  const rules = rulesFor(filePath);
  if (ext === ".webp" && source.size <= rules.targetBytes) {
    result.reason = `already WebP and small (≤ ${Math.round(rules.targetBytes / 1024)} KB)`;
    return result;
  }
  const variant = variantPathFor(filePath);
  result.variant = variant;
  const existing = await exists(variant);
  if (existing && !force && existing.mtimeMs >= source.mtimeMs) {
    result.after = existing.size;
    result.reason = "variant already up to date";
    return result;
  }
  let encoded;
  try {
    encoded = await encodeWebp(sharp, filePath, rules);
  } catch (error) {
    result.reason = `cannot decode (${error instanceof Error ? error.message : String(error)})`;
    return result;
  }
  result.after = encoded.buffer.length;
  result.quality = encoded.quality;
  result.width = encoded.width;
  if (encoded.buffer.length > source.size * (1 - MIN_SAVING)) {
    result.reason = `saving under ${MIN_SAVING * 100}% — original kept as the only copy`;
    return result;
  }
  result.action = "write";
  result.reason = apply ? "written" : "would write (dry run)";
  if (apply) {
    // Write to a temp name and rename, so nginx never serves a half-written
    // file; world-readable like the rest of /uploads.
    const tmp = `${variant}.tmp-${process.pid}`;
    await writeFile(tmp, encoded.buffer);
    await chmod(tmp, 0o644);
    await rename(tmp, variant);
  }
  return result;
}

/** Remove the variant of an original (when the original is deleted). */
export async function removeVariantOf(filePath) {
  const variant = variantPathFor(filePath);
  if (!variant) {
    return;
  }
  try {
    await unlink(variant);
  } catch {
    // No variant — nothing to do.
  }
}

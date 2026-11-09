/**
 * Intrinsic width/height of a site image (`/uploads/…` or another file under
 * `public/`), so an <img> can carry width/height attributes and reserve its
 * box before it loads — no layout shift (SEO phase 4, D1).
 *
 * Reads only the file header (sharp `metadata()`, no decoding) and caches the
 * answer for the life of the server process. Uploaded files have UUID names
 * and never change, so the cache never goes stale; a missing or unreadable
 * file caches `null` and the caller falls back to CSS sizing.
 *
 * Server-only (uses the filesystem).
 */
import { stat } from "node:fs/promises";
import path from "node:path";

export type ImageSize = { width: number; height: number };

const cache = new Map<string, ImageSize | null>();
const MAX_ENTRIES = 5_000;
const PUBLIC_DIR = path.join(process.cwd(), "public");

export async function getImageSize(src: string | null | undefined): Promise<ImageSize | null> {
  if (!src || !src.startsWith("/") || src.startsWith("//") || src.includes("..")) {
    return null;
  }
  const clean = src.split(/[?#]/)[0]!;
  if (cache.has(clean)) {
    return cache.get(clean) ?? null;
  }
  let size: ImageSize | null = null;
  try {
    const file = path.join(PUBLIC_DIR, clean);
    if (!file.startsWith(PUBLIC_DIR)) {
      return null;
    }
    await stat(file);
    const { default: sharp } = await import("sharp");
    const meta = await sharp(file, { limitInputPixels: false }).metadata();
    if (meta.width && meta.height) {
      size = { width: meta.width, height: meta.height };
    }
  } catch {
    size = null;
  }
  if (cache.size >= MAX_ENTRIES) {
    cache.clear();
  }
  cache.set(clean, size);
  return size;
}

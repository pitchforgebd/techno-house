/**
 * B2B KYC document storage (AD-257).
 *
 * Trade licence / NID scans are sensitive personal documents — unlike the
 * admin media library (public/uploads, meant to be publicly servable),
 * these are written OUTSIDE `public/` so Next.js never serves them
 * directly. Retrieval must go through an authenticated staff route that
 * checks `customer.b2b.view` before streaming the file back.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyFileSignature } from "@/lib/media/file-signature";
import {
  getActiveStorageDriver,
  STORAGE_DRIVER_LABELS,
} from "@/lib/storage/filesystem-config";

const STORAGE_ROOT = path.join(process.cwd(), "private-uploads", "b2b");
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
const MAX_BYTES = 8 * 1024 * 1024;
const KEY_PATTERN = /^[a-f0-9-]+\.(jpg|jpeg|png|webp|pdf)$/i;

export type SavedB2BDocument = { storageKey: string; mimeType: string };

function mimeFromExt(ext: string): string {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export async function saveB2BDocument(
  file: File,
): Promise<{ ok: true; document: SavedB2BDocument } | { ok: false; formError: string }> {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return {
      ok: false,
      formError: `Unsupported file type: ${file.name}. Use JPG, PNG, WEBP, or PDF.`,
    };
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return {
      ok: false,
      formError: `"${file.name}" must be between 1 byte and 8 MB.`,
    };
  }

  const driver = await getActiveStorageDriver();
  if (driver !== "local") {
    return {
      ok: false,
      formError: `${STORAGE_DRIVER_LABELS[driver]} is enabled in Settings → Filesystem, but that integration isn't built yet. Turn it off there to keep uploading to local disk.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // This is the only upload path a non-staff visitor can reach, so the
  // contents matter more here than anywhere else (DSA-11). Checked before the
  // directory is created or anything is written.
  const signature = verifyFileSignature(ext, buffer);
  if (!signature.ok) {
    return { ok: false, formError: `“${file.name}”: ${signature.reason}` };
  }

  await mkdir(STORAGE_ROOT, { recursive: true });
  const storedName = `${randomUUID()}${ext}`;
  const abs = path.join(STORAGE_ROOT, storedName);
  await writeFile(abs, buffer);

  return { ok: true, document: { storageKey: storedName, mimeType: mimeFromExt(ext) } };
}

export async function readB2BDocument(
  storageKey: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!KEY_PATTERN.test(storageKey)) {
    return null;
  }
  const abs = path.join(STORAGE_ROOT, storageKey);
  try {
    const buffer = await readFile(abs);
    return { buffer, mimeType: mimeFromExt(path.extname(storageKey).toLowerCase()) };
  } catch {
    return null;
  }
}

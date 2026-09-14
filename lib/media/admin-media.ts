/**
 * Admin media library — files on disk under `public/uploads` + `MediaAsset` rows.
 */
import { randomUUID } from "node:crypto";
import { verifyFileSignature } from "@/lib/media/file-signature";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import type { AdminMediaAsset, MediaFolder } from "@/lib/admin/media-mock";
import type { MediaListParams } from "@/lib/admin/support-list-params";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";
import type { MediaKind as DbMediaKind } from "@/lib/generated/prisma/enums";
import {
  getActiveStorageDriver,
  STORAGE_DRIVER_LABELS,
} from "@/lib/storage/filesystem-config";

export const MEDIA_DB_REQUIRED =
  "Media needs the database. Remove DATA_SOURCE=mock.";

export type MediaMutationResult =
  | { ok: true; id: string; count?: number; path?: string }
  | { ok: false; formError: string };

export type MediaActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 20;
const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
]);

function fail(formError: string): MediaMutationResult {
  return { ok: false, formError };
}

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (!width || !height) {
    return "—";
  }
  return `${width} × ${height}`;
}

function toUiKind(kind: DbMediaKind): AdminMediaAsset["kind"] {
  return kind === "SVG" ? "svg" : "image";
}

function toDbKind(filename: string, mime: string): DbMediaKind {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".svg" || mime === "image/svg+xml") {
    return "SVG";
  }
  return "IMAGE";
}

function guessFolder(src: string): MediaFolder {
  if (src.includes("/products/") || src.startsWith("/products/")) {
    return "products";
  }
  if (src.includes("/brands/") || src.startsWith("/brands/")) {
    return "brands";
  }
  if (src.includes("/home/") || src.startsWith("/home/")) {
    return "home";
  }
  if (src.includes("/categories/") || src.startsWith("/categories/")) {
    return "categories";
  }
  if (src.includes("unsplash.com") || src.includes("/photo-")) {
    return "products";
  }
  return "general";
}

function filenameFromSrc(src: string): string {
  try {
    if (/^https?:\/\//i.test(src)) {
      const url = new URL(src);
      const base = path.basename(url.pathname) || "image";
      if (path.extname(base)) {
        return sanitizeFilename(base);
      }
      return sanitizeFilename(`${base}.jpg`);
    }
  } catch {
    // Fall through to path basename.
  }
  return sanitizeFilename(path.basename(src.split("?")[0] ?? "") || "image");
}

function kindFromSrc(src: string, filename: string): DbMediaKind {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".svg" || src.toLowerCase().includes(".svg")) {
    return "SVG";
  }
  return "IMAGE";
}

function isIndexableSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }
  return /^https?:\/\//i.test(trimmed);
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\-]+/g, "-").slice(0, 80);
  return base || "file";
}

type MediaIndexRow = {
  path: string;
  filename: string;
  kind: DbMediaKind;
  folder: MediaFolder;
  alt: string | null;
};

async function createMediaRows(rows: MediaIndexRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const unique = new Map<string, MediaIndexRow>();
  for (const row of rows) {
    if (!unique.has(row.path)) {
      unique.set(row.path, row);
    }
  }
  await getPrisma().mediaAsset.createMany({
    data: [...unique.values()],
    skipDuplicates: true,
  });
}

function absoluteFromPublicPath(publicPath: string): string | null {
  if (!publicPath.startsWith("/") || publicPath.startsWith("//")) {
    return null;
  }
  const relative = publicPath.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", relative);
  const publicRoot = path.join(process.cwd(), "public");

  // Containment by `path.relative`, not by string prefix (F-13).
  //
  // `path.join` already collapses `..`, so classic traversal was handled. What
  // a bare `startsWith(publicRoot)` does NOT catch is a SIBLING directory whose
  // name begins with the same characters: `<cwd>/publicdata/x` starts with
  // `<cwd>/public` and passed. Asking for the relative path instead is exact —
  // anything outside the root has to climb out of it with `..`.
  const inside = path.relative(publicRoot, abs);
  if (!inside || inside.startsWith("..") || path.isAbsolute(inside)) {
    return null;
  }
  return abs;
}

function toAdminAsset(row: {
  id: string;
  path: string;
  filename: string;
  kind: DbMediaKind;
  folder: string;
  alt: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
}): AdminMediaAsset {
  const folder = (
    ["products", "brands", "home", "general", "categories"].includes(row.folder)
      ? row.folder
      : "general"
  ) as MediaFolder;
  return {
    id: row.id,
    filename: row.filename,
    path: row.path,
    kind: toUiKind(row.kind),
    folder,
    alt: row.alt ?? "",
    sizeLabel: formatSize(row.sizeBytes),
    dimensions: formatDimensions(row.width, row.height),
    uploadedAt: row.createdAt.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    uploadedAtSort: row.createdAt.toISOString(),
    usedIn: [],
  };
}

/**
 * Index catalogue images, brand logos, and local `public/{products,brands,home}`
 * assets into MediaAsset so the admin library is populated.
 */
async function syncCatalogMediaIntoLibrary(): Promise<void> {
  const prisma = getPrisma();
  const rows: MediaIndexRow[] = [];

  const images = await prisma.productImage.findMany({
    select: {
      src: true,
      alt: true,
      product: { select: { name: true } },
    },
    take: 1000,
  });
  for (const image of images) {
    const src = image.src.trim();
    if (!isIndexableSrc(src)) {
      continue;
    }
    const filename = filenameFromSrc(src);
    rows.push({
      path: src,
      filename,
      kind: kindFromSrc(src, filename),
      folder: guessFolder(src),
      alt: image.alt || image.product.name,
    });
  }

  const brands = await prisma.brand.findMany({
    where: { logoSrc: { not: null } },
    select: { name: true, logoSrc: true },
    take: 200,
  });
  for (const brand of brands) {
    const src = (brand.logoSrc ?? "").trim();
    if (!isIndexableSrc(src)) {
      continue;
    }
    const filename = filenameFromSrc(src);
    rows.push({
      path: src,
      filename,
      kind: kindFromSrc(src, filename),
      folder: "brands",
      alt: `${brand.name} logo`,
    });
  }

  const publicFolders: MediaFolder[] = ["products", "brands", "home"];
  for (const folder of publicFolders) {
    const dir = path.join(process.cwd(), "public", folder);
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        continue;
      }
      const publicPath = `/${folder}/${entry}`;
      rows.push({
        path: publicPath,
        filename: entry,
        kind: kindFromSrc(publicPath, entry),
        folder,
        alt: path.basename(entry, ext).replace(/[-_]+/g, " "),
      });
    }
  }

  await createMediaRows(rows);
}

export type AdminMediaListResult = {
  items: AdminMediaAsset[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: MediaListParams;
};

export async function listAdminMedia(
  params: MediaListParams,
  pageSize: number,
): Promise<AdminMediaListResult> {
  if (!usesDatabase()) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageCount: 1,
      pageSize,
      params: { ...params, page: 1 },
    };
  }

  await syncCatalogMediaIntoLibrary();

  const where: {
    folder?: string;
    OR?: {
      filename?: { contains: string; mode: "insensitive" };
      alt?: { contains: string; mode: "insensitive" };
      path?: { contains: string; mode: "insensitive" };
    }[];
  } = {};

  if (params.folder !== "all") {
    where.folder = params.folder;
  }
  if (params.q) {
    where.OR = [
      { filename: { contains: params.q, mode: "insensitive" } },
      { alt: { contains: params.q, mode: "insensitive" } },
      { path: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const orderBy =
    params.sort === "oldest"
      ? { createdAt: "asc" as const }
      : params.sort === "name"
        ? { filename: "asc" as const }
        : { createdAt: "desc" as const };

  const prisma = getPrisma();
  const total = await prisma.mediaAsset.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const rows = await prisma.mediaAsset.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: rows.map(toAdminAsset),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function getAdminMedia(
  id: string,
): Promise<AdminMediaAsset | null> {
  if (!usesDatabase()) {
    return null;
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().mediaAsset.findUnique({
    where: { id: trimmed },
  });
  return row ? toAdminAsset(row) : null;
}

export async function uploadAdminMediaFiles(input: {
  files: File[];
  folder: MediaFolder;
  actor?: MediaActor;
}): Promise<MediaMutationResult> {
  if (!usesDatabase()) {
    return fail(MEDIA_DB_REQUIRED);
  }
  const files = input.files.slice(0, MAX_FILES);
  if (files.length === 0) {
    return fail("Choose at least one image file.");
  }

  const driver = await getActiveStorageDriver();
  if (driver !== "local") {
    return fail(
      `${STORAGE_DRIVER_LABELS[driver]} is enabled in Settings → Filesystem, but that integration isn't built yet. Turn it off there to keep uploading to local disk.`,
    );
  }

  const folder = input.folder;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  const createdIds: string[] = [];
  let lastPath = "";
  for (const file of files) {
    const original = sanitizeFilename(file.name);
    const ext = path.extname(original).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return fail(`Unsupported file type: ${original}`);
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return fail(`“${original}” must be between 1 byte and 5 MB.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // The extension and `file.type` above are both attacker-controlled, so the
    // real check is the contents (DSA-11). Runs BEFORE anything is written to
    // disk, so a rejected upload leaves no file behind.
    const signature = verifyFileSignature(ext, buffer);
    if (!signature.ok) {
      return fail(`“${original}”: ${signature.reason}`);
    }

    const storedName = `${randomUUID()}${ext}`;
    const publicPath = `/uploads/${folder}/${storedName}`;
    const abs = path.join(dir, storedName);
    await writeFile(abs, buffer);

    const row = await getPrisma().mediaAsset.create({
      data: {
        path: publicPath,
        filename: original,
        kind: toDbKind(original, file.type),
        folder,
        alt: path.basename(original, ext).replace(/[-_]+/g, " "),
        sizeBytes: file.size,
        uploadedByStaffId: input.actor?.staffId ?? null,
      },
      select: { id: true },
    });
    createdIds.push(row.id);
    lastPath = publicPath;
  }

  if (input.actor && createdIds[0]) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.MEDIA_UPLOAD,
      entityType: "MediaAsset",
      entityId: createdIds[0],
      metadata: { count: createdIds.length, folder },
      ip: input.actor.ip,
    });
  }

  return {
    ok: true,
    id: createdIds[0] ?? "uploaded",
    count: createdIds.length,
    path: lastPath || undefined,
  };
}

export async function updateAdminMediaAlt(input: {
  id: string;
  alt: string;
  actor?: MediaActor;
}): Promise<MediaMutationResult> {
  if (!usesDatabase()) {
    return fail(MEDIA_DB_REQUIRED);
  }
  const id = input.id.trim();
  if (!id) {
    return fail("That file no longer exists.");
  }
  const alt = input.alt.replace(/[<>]/g, "").trim().slice(0, 200);
  const existing = await getPrisma().mediaAsset.findUnique({
    where: { id },
    select: { id: true, path: true },
  });
  if (!existing) {
    return fail("That file no longer exists.");
  }
  await getPrisma().mediaAsset.update({
    where: { id: existing.id },
    data: { alt: alt || null },
  });
  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.MEDIA_UPDATE,
      entityType: "MediaAsset",
      entityId: existing.id,
      metadata: { path: existing.path },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: existing.id };
}

export async function deleteAdminMedia(input: {
  ids: string[];
  actor?: MediaActor;
}): Promise<MediaMutationResult> {
  if (!usesDatabase()) {
    return fail(MEDIA_DB_REQUIRED);
  }
  const ids = [...new Set(input.ids.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return fail("Choose at least one file.");
  }
  const rows = await getPrisma().mediaAsset.findMany({
    where: { id: { in: ids } },
    select: { id: true, path: true },
  });
  if (rows.length === 0) {
    return fail("Those files could not be deleted.");
  }

  for (const row of rows) {
    if (row.path.startsWith("/uploads/")) {
      const abs = absoluteFromPublicPath(row.path);
      if (abs) {
        try {
          await unlink(abs);
        } catch {
          // File may already be missing on disk.
        }
      }
    }
  }

  await getPrisma().mediaAsset.deleteMany({
    where: { id: { in: rows.map((row) => row.id) } },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.MEDIA_DELETE,
      entityType: "MediaAsset",
      entityId: rows[0]?.id ?? null,
      metadata: { count: rows.length },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: rows[0]?.id ?? "deleted", count: rows.length };
}

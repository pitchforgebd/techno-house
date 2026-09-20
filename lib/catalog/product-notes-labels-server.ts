/**
 * Server-only counterpart to `product-notes-labels.ts` (Phase 14).
 *
 * Real Prisma-backed option loaders and id validators for product
 * notes/labels. Only import this from server-only code (server actions,
 * other `lib/` files) — never from a `"use client"` component; that's what
 * broke the production build before this file existed (see
 * `product-notes-labels.ts`'s header comment).
 */
import { getPrisma } from "@/lib/db/prisma";
import {
  NOTE_TYPES,
  PRODUCT_LABEL_MAX,
  PRODUCT_NOTE_MAX,
  type AdminNoteType,
  type ProductLabelOption,
  type ProductNoteOption,
  type ProductPresetLookup,
} from "@/lib/catalog/product-notes-labels";
import { loadActivePromotionProductIds } from "@/lib/marketing/promotions";

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function toNoteType(raw: string): AdminNoteType {
  return (NOTE_TYPES as readonly string[]).includes(raw)
    ? (raw as AdminNoteType)
    : NOTE_TYPES[0];
}

export async function listProductNoteOptions(): Promise<ProductNoteOption[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().productNotePreset.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    select: { id: true, type: true, description: true },
  });
  return rows.map((row) => ({
    id: row.id,
    type: toNoteType(row.type),
    description: row.description,
  }));
}

/** Only active labels are offered to products or shown on the storefront. */
export async function listProductLabelOptions(): Promise<ProductLabelOption[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().productLabelPreset.findMany({
    where: { isActive: true },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    select: { id: true, text: true, backgroundColor: true, textTone: true },
  });
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    backgroundColor: row.backgroundColor,
    textTone: row.textTone === "dark" ? "dark" : "light",
  }));
}

/** One query per request/list, not per product. */
export async function loadProductPresetLookup(): Promise<ProductPresetLookup> {
  const [notes, labels, activeOfferProductIds] = await Promise.all([
    listProductNoteOptions(),
    listProductLabelOptions(),
    loadActivePromotionProductIds(),
  ]);
  return {
    notes: new Map(notes.map((note) => [note.id, note])),
    labels: new Map(labels.map((label) => [label.id, label])),
    activeOfferProductIds,
  };
}

export async function parseProductNoteIds(
  ids: string[] | undefined,
): Promise<{ ok: true; value: string[] } | { ok: false; formError: string }> {
  const raw = ids ?? [];
  if (raw.length > PRODUCT_NOTE_MAX) {
    return {
      ok: false,
      formError: `A product can have at most ${PRODUCT_NOTE_MAX} notes.`,
    };
  }
  if (raw.length === 0) {
    return { ok: true, value: [] };
  }
  const known = new Set((await listProductNoteOptions()).map((n) => n.id));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of raw) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    if (!known.has(trimmed)) {
      return { ok: false, formError: "One of the selected notes is invalid." };
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return { ok: true, value: out };
}

export async function parseProductLabelIds(
  ids: string[] | undefined,
): Promise<{ ok: true; value: string[] } | { ok: false; formError: string }> {
  const raw = ids ?? [];
  if (raw.length > PRODUCT_LABEL_MAX) {
    return {
      ok: false,
      formError: `A product can have at most ${PRODUCT_LABEL_MAX} labels.`,
    };
  }
  if (raw.length === 0) {
    return { ok: true, value: [] };
  }
  const known = new Set((await listProductLabelOptions()).map((l) => l.id));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of raw) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    if (!known.has(trimmed)) {
      return { ok: false, formError: "One of the selected labels is invalid." };
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return { ok: true, value: out };
}

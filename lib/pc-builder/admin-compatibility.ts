/**
 * Admin "Compatibility data" (AD-348): the staff-facing way to give PC Builder
 * parts the socket / RAM type / form factor / drive interface / wattage values
 * the storefront picker filters on, without scripts or CSV.
 *
 * Values are validated by the exact parser the product form uses
 * (`parseBuilderFields`), so a value typed here is canonicalised and bounded
 * the same way. Only the columns a slot actually checks can be set.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  parseBuilderFields,
  type ProductInputFields,
} from "@/lib/catalog/product-input";
import type { BuilderAttrs, BuilderSlot } from "@/lib/data/types/catalog";
import { toDbBuilderSlot } from "@/lib/data/prisma/mappers";
import { getPrisma } from "@/lib/db/prisma";
import {
  missingRequiredFields,
  type CompatibilityCoverageRow,
  type CompatibilityProductRow,
} from "@/lib/domain/pc-builder/compat-status";
import {
  SLOT_ATTRIBUTE_FIELDS,
  SLOT_REQUIRED_FIELDS,
  type BuilderAttrField,
} from "@/lib/domain/pc-builder/attribute-options";
import { BUILDER_SLOTS } from "@/lib/domain/pc-builder/slots";

export const COMPATIBILITY_DB_REQUIRED =
  "Compatibility changes need the database. Turn off DATA_SOURCE=mock to save.";

export const COMPAT_PAGE_SIZE = 25;
export const COMPAT_BULK_MAX = 200;

export type CompatibilityActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type CompatibilityMutationResult =
  | { ok: true; updated: number }
  | { ok: false; formError: string };

export type CompatibilityValues = Partial<Record<BuilderAttrField, string>>;
export type CompatibilityStatusFilter = "missing" | "ready" | "all";

/** Slots that have fit rules, in the storefront's slot order. */
export const COMPATIBILITY_SLOTS: readonly { id: BuilderSlot; label: string }[] =
  BUILDER_SLOTS.filter((slot) => SLOT_REQUIRED_FIELDS[slot.id]).map((slot) => ({
    id: slot.id,
    label: slot.label,
  }));

const COLUMN: Record<BuilderAttrField, string> = {
  socket: "builderSocket",
  ramType: "builderRamType",
  formFactor: "builderFormFactor",
  storageInterface: "builderStorageInterface",
  tdpWatts: "builderTdpWatts",
};

const FIELD_KEYS = Object.keys(COLUMN) as BuilderAttrField[];

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

const ROW_SELECT = {
  id: true,
  sku: true,
  name: true,
  isActive: true,
  brand: { select: { name: true } },
  builderSocket: true,
  builderRamType: true,
  builderFormFactor: true,
  builderTdpWatts: true,
  builderStorageInterface: true,
} as const;

type DbRow = {
  id: string;
  sku: string;
  name: string;
  isActive: boolean;
  brand: { name: string };
  builderSocket: string | null;
  builderRamType: string | null;
  builderFormFactor: string | null;
  builderTdpWatts: number | null;
  builderStorageInterface: string | null;
};

function attrsOf(row: DbRow): BuilderAttrs {
  const attrs: BuilderAttrs = {};
  if (row.builderSocket) attrs.socket = row.builderSocket;
  if (row.builderRamType) attrs.ramType = row.builderRamType;
  if (row.builderFormFactor) attrs.formFactor = row.builderFormFactor;
  if (row.builderStorageInterface) {
    attrs.storageInterface = row.builderStorageInterface;
  }
  if (row.builderTdpWatts != null) attrs.tdpWatts = row.builderTdpWatts;
  return attrs;
}

function toProductRow(slot: BuilderSlot, row: DbRow): CompatibilityProductRow {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name.replace(/\s+/g, " ").trim(),
    brandName: row.brand.name,
    isActive: row.isActive,
    values: {
      socket: row.builderSocket ?? "",
      ramType: row.builderRamType ?? "",
      formFactor: row.builderFormFactor ?? "",
      storageInterface: row.builderStorageInterface ?? "",
      tdpWatts: row.builderTdpWatts != null ? String(row.builderTdpWatts) : "",
    },
    missing: missingRequiredFields(slot, attrsOf(row)),
  };
}

export function isCompatibilitySlot(value: string): value is BuilderSlot {
  return COMPATIBILITY_SLOTS.some((slot) => slot.id === value);
}

/** Ready / total per slot — active products only, as that is what the picker loads. */
export async function loadCompatibilityCoverage(): Promise<
  CompatibilityCoverageRow[]
> {
  if (!usesDatabase()) {
    return COMPATIBILITY_SLOTS.map((slot) => ({
      slot: slot.id,
      label: slot.label,
      total: 0,
      ready: 0,
    }));
  }
  const rows = await getPrisma().product.findMany({
    where: {
      isActive: true,
      builderSlot: { in: COMPATIBILITY_SLOTS.map((s) => toDbBuilderSlot(s.id)) },
    },
    select: { ...ROW_SELECT, builderSlot: true },
  });
  const totals = new Map<string, { total: number; ready: number }>();
  for (const row of rows) {
    const slot = String(row.builderSlot).toLowerCase() as BuilderSlot;
    const entry = totals.get(slot) ?? { total: 0, ready: 0 };
    entry.total += 1;
    if (missingRequiredFields(slot, attrsOf(row)).length === 0) entry.ready += 1;
    totals.set(slot, entry);
  }
  return COMPATIBILITY_SLOTS.map((slot) => ({
    slot: slot.id,
    label: slot.label,
    total: totals.get(slot.id)?.total ?? 0,
    ready: totals.get(slot.id)?.ready ?? 0,
  }));
}

export type CompatibilityListResult = {
  rows: CompatibilityProductRow[];
  total: number;
  page: number;
  pageCount: number;
};

export async function loadCompatibilityProducts(input: {
  slot: BuilderSlot;
  status: CompatibilityStatusFilter;
  q: string;
  page: number;
}): Promise<CompatibilityListResult> {
  if (!usesDatabase()) {
    return { rows: [], total: 0, page: 1, pageCount: 1 };
  }
  const q = input.q.trim().slice(0, 80);
  const found = await getPrisma().product.findMany({
    where: {
      isActive: true,
      builderSlot: toDbBuilderSlot(input.slot),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: ROW_SELECT,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  const all = found
    .map((row) => toProductRow(input.slot, row))
    .filter((row) =>
      input.status === "all"
        ? true
        : input.status === "missing"
          ? row.missing.length > 0
          : row.missing.length === 0,
    );
  const pageCount = Math.max(1, Math.ceil(all.length / COMPAT_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(input.page) || 1), pageCount);
  return {
    rows: all.slice((page - 1) * COMPAT_PAGE_SIZE, page * COMPAT_PAGE_SIZE),
    total: all.length,
    page,
    pageCount,
  };
}

/**
 * Validates `values` for `slot` with the product form's parser. Returns the
 * database columns to write — a provided field with an empty value maps to
 * null (clear); a field that was not provided is absent (untouched).
 */
function parseValues(
  slot: BuilderSlot,
  values: CompatibilityValues,
  options: { skipEmpty: boolean },
):
  | { ok: true; columns: Record<string, string | number | null> }
  | { ok: false; formError: string } {
  const allowed = SLOT_ATTRIBUTE_FIELDS[slot] ?? [];
  const provided = FIELD_KEYS.filter((field) => {
    const raw = values[field];
    if (typeof raw !== "string") return false;
    return options.skipEmpty ? raw.trim() !== "" : true;
  });
  for (const field of provided) {
    if (!allowed.includes(field)) {
      return {
        ok: false,
        formError: `${field} is not used by the ${slot} slot.`,
      };
    }
  }
  const parsed = parseBuilderFields({
    builderSlot: slot,
    builderSocket: values.socket ?? "",
    builderRamType: values.ramType ?? "",
    builderFormFactor: values.formFactor ?? "",
    builderStorageInterface: values.storageInterface ?? "",
    builderTdpWatts: values.tdpWatts ?? "",
  } as ProductInputFields);
  if (!parsed.ok) {
    return parsed;
  }
  const columns: Record<string, string | number | null> = {};
  for (const field of provided) {
    columns[COLUMN[field]] = parsed.attrs?.[field] ?? null;
  }
  return { ok: true, columns };
}

async function audit(
  actor: CompatibilityActor,
  action: string,
  entityId: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action,
    entityType: "Product",
    entityId,
    ip: actor.ip,
    metadata,
  });
}

/** Saves one product's values (empty value clears that field). */
export async function saveProductCompatibility(input: {
  productId: string;
  values: CompatibilityValues;
  actor: CompatibilityActor;
}): Promise<CompatibilityMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: COMPATIBILITY_DB_REQUIRED };
  }
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, sku: true, builderSlot: true },
  });
  if (!product?.builderSlot) {
    return { ok: false, formError: "That product is not a PC Builder part." };
  }
  const slot = product.builderSlot.toLowerCase() as BuilderSlot;
  const parsed = parseValues(slot, input.values, { skipEmpty: false });
  if (!parsed.ok) {
    return parsed;
  }
  if (Object.keys(parsed.columns).length === 0) {
    return { ok: false, formError: "Nothing to save." };
  }
  await prisma.product.update({
    where: { id: product.id },
    data: parsed.columns,
  });
  await audit(input.actor, AUDIT_ACTIONS.PC_COMPAT_UPDATE, product.id, {
    sku: product.sku,
    slot,
    set: parsed.columns,
  });
  return { ok: true, updated: 1 };
}

/**
 * Applies the same values to many parts of one slot. Blank inputs are ignored
 * (they never clear anything). "fill_empty" leaves a part's existing value
 * alone; "overwrite" replaces it.
 */
export async function applyBulkCompatibility(input: {
  slot: BuilderSlot;
  productIds: string[];
  values: CompatibilityValues;
  mode: "fill_empty" | "overwrite";
  actor: CompatibilityActor;
}): Promise<CompatibilityMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: COMPATIBILITY_DB_REQUIRED };
  }
  const ids = [...new Set(input.productIds)].slice(0, COMPAT_BULK_MAX + 1);
  if (ids.length === 0) {
    return { ok: false, formError: "Select at least one product." };
  }
  if (ids.length > COMPAT_BULK_MAX) {
    return {
      ok: false,
      formError: `Select at most ${COMPAT_BULK_MAX} products at a time.`,
    };
  }
  const parsed = parseValues(input.slot, input.values, { skipEmpty: true });
  if (!parsed.ok) {
    return parsed;
  }
  if (Object.keys(parsed.columns).length === 0) {
    return { ok: false, formError: "Choose at least one value to apply." };
  }

  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, builderSlot: toDbBuilderSlot(input.slot) },
    select: ROW_SELECT,
  });
  if (products.length !== ids.length) {
    return {
      ok: false,
      formError:
        "Some selected products are no longer in this slot — reload the page and try again.",
    };
  }

  const updates: { id: string; data: Record<string, string | number | null> }[] =
    [];
  for (const product of products) {
    const current = product as unknown as Record<string, unknown>;
    const data: Record<string, string | number | null> = {};
    for (const [column, value] of Object.entries(parsed.columns)) {
      const existing = current[column];
      const isEmpty = existing == null || existing === "";
      if (input.mode === "overwrite" || isEmpty) {
        data[column] = value;
      }
    }
    if (Object.keys(data).length > 0) updates.push({ id: product.id, data });
  }
  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.product.update({ where: { id: update.id }, data: update.data }),
      ),
    );
  }
  await audit(input.actor, AUDIT_ACTIONS.PC_COMPAT_BULK_UPDATE, null, {
    slot: input.slot,
    mode: input.mode,
    set: parsed.columns,
    requested: ids.length,
    updated: updates.length,
    productIds: ids.slice(0, 100),
  });
  return { ok: true, updated: updates.length };
}

/** Takes a product out of the PC Builder entirely (wrong-category items). */
export async function clearProductBuilderSlot(input: {
  productId: string;
  actor: CompatibilityActor;
}): Promise<CompatibilityMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: COMPATIBILITY_DB_REQUIRED };
  }
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { ...ROW_SELECT, builderSlot: true },
  });
  if (!product?.builderSlot) {
    return { ok: false, formError: "That product is not a PC Builder part." };
  }
  await prisma.product.update({
    where: { id: product.id },
    data: {
      builderSlot: null,
      builderSocket: null,
      builderRamType: null,
      builderFormFactor: null,
      builderTdpWatts: null,
      builderStorageInterface: null,
    },
  });
  await audit(input.actor, AUDIT_ACTIONS.PC_SLOT_CLEAR, product.id, {
    sku: product.sku,
    previousSlot: product.builderSlot.toLowerCase(),
    previousValues: attrsOf(product),
  });
  return { ok: true, updated: 1 };
}

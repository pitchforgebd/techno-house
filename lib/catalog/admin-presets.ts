/**
 * Catalogue preset managers — Phase 3.
 *
 * `/admin/units`, `/admin/notes`, `/admin/labels` were hardcoded mock arrays
 * with fake save toasts; `/admin/warranty` was a fake duplicate UI over
 * `ProductWarranty`, which was already real and already referenced by
 * `Product.warrantyId`.
 *
 * Units/notes/labels now have real tables, seeded from the old mock arrays
 * **using the same ids**, so existing `Product.noteIds` / `Product.labelIds`
 * associations keep resolving.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { NOTE_TYPES, type AdminNoteType } from "@/lib/admin/notes-mock";
import { warrantyBadgeFromLabel } from "@/lib/catalog/warranty-badge";

export const PRESET_DB_REQUIRED =
  "Catalogue presets need the database. Turn off DATA_SOURCE=mock to save.";

export type PresetMutationResult =
  | { ok: true; id: string }
  | { ok: false; formError: string };

export type PresetActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export const UNIT_NAME_MAX = 40;
export const NOTE_DESCRIPTION_MAX = 600;
export const LABEL_TEXT_MAX = 40;
export const WARRANTY_LABEL_MAX = 60;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): PresetMutationResult {
  return { ok: false, formError };
}

async function audit(
  actor: PresetActor | undefined,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  if (!actor) {
    return;
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action,
    entityType,
    entityId,
    ip: actor.ip,
    metadata,
  });
}

// ---------------------------------------------------------------- units ----

export type AdminUnitRow = { id: string; name: string };

export async function listAdminUnits(): Promise<AdminUnitRow[]> {
  if (!usesDatabase()) {
    return [];
  }
  return getPrisma().productUnit.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function saveUnit(input: {
  id?: string;
  name: string;
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, UNIT_NAME_MAX);
  if (!name) {
    return fail("Enter a unit name.");
  }

  // `name` is unique in the schema; check first so the admin sees a real
  // message instead of a database constraint error.
  const clash = await getPrisma().productUnit.findFirst({
    where: { name, ...(input.id ? { NOT: { id: input.id } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return fail(`A unit named "${name}" already exists.`);
  }

  if (input.id) {
    const existing = await getPrisma().productUnit.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!existing) {
      return fail("That unit no longer exists.");
    }
  }

  const row = input.id
    ? await getPrisma().productUnit.update({
        where: { id: input.id },
        data: { name },
        select: { id: true },
      })
    : await getPrisma().productUnit.create({
        data: { name },
        select: { id: true },
      });

  await audit(
    input.actor,
    input.id ? AUDIT_ACTIONS.UNIT_UPDATE : AUDIT_ACTIONS.UNIT_CREATE,
    "ProductUnit",
    row.id,
    { name },
  );
  return { ok: true, id: row.id };
}

export async function deleteUnit(input: {
  id: string;
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const existing = await getPrisma().productUnit.findUnique({
    where: { id: input.id },
    select: { id: true, name: true },
  });
  if (!existing) {
    return fail("That unit no longer exists.");
  }
  await getPrisma().productUnit.delete({ where: { id: input.id } });
  await audit(input.actor, AUDIT_ACTIONS.UNIT_DELETE, "ProductUnit", input.id, {
    name: existing.name,
  });
  return { ok: true, id: input.id };
}

// ---------------------------------------------------------------- notes ----

export type AdminNoteRow = {
  id: string;
  type: AdminNoteType;
  description: string;
};

function normalizeNoteType(raw: string): AdminNoteType | null {
  return (NOTE_TYPES as readonly string[]).includes(raw)
    ? (raw as AdminNoteType)
    : null;
}

export async function listAdminNotes(): Promise<AdminNoteRow[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().productNotePreset.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    select: { id: true, type: true, description: true },
  });
  return rows.map((row) => ({
    id: row.id,
    // Stored as free text; fall back to the first known type if a row predates
    // a type being renamed, rather than crashing the admin list.
    type: normalizeNoteType(row.type) ?? NOTE_TYPES[0],
    description: row.description,
  }));
}

export async function saveNote(input: {
  id?: string;
  type: string;
  description: string;
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const type = normalizeNoteType(input.type.trim());
  if (!type) {
    return fail("Choose a valid note type.");
  }
  const description = input.description
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, NOTE_DESCRIPTION_MAX);
  if (!description) {
    return fail("Enter a note description.");
  }

  if (input.id) {
    const existing = await getPrisma().productNotePreset.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!existing) {
      return fail("That note no longer exists.");
    }
  }

  const row = input.id
    ? await getPrisma().productNotePreset.update({
        where: { id: input.id },
        data: { type, description },
        select: { id: true },
      })
    : await getPrisma().productNotePreset.create({
        data: { type, description },
        select: { id: true },
      });

  await audit(
    input.actor,
    input.id ? AUDIT_ACTIONS.NOTE_UPDATE : AUDIT_ACTIONS.NOTE_CREATE,
    "ProductNotePreset",
    row.id,
    { type },
  );
  return { ok: true, id: row.id };
}

export async function deleteNote(input: {
  id: string;
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const existing = await getPrisma().productNotePreset.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return fail("That note no longer exists.");
  }

  // `Product.noteIds` is a plain String[], so nothing cascades — detach the id
  // from every product that references it, or products keep a dangling id.
  const attached = await getPrisma().product.findMany({
    where: { noteIds: { has: input.id } },
    select: { id: true, noteIds: true },
  });
  await getPrisma().$transaction([
    ...attached.map((product) =>
      getPrisma().product.update({
        where: { id: product.id },
        data: { noteIds: product.noteIds.filter((id) => id !== input.id) },
      }),
    ),
    getPrisma().productNotePreset.delete({ where: { id: input.id } }),
  ]);

  await audit(
    input.actor,
    AUDIT_ACTIONS.NOTE_DELETE,
    "ProductNotePreset",
    input.id,
    { detachedFromProducts: attached.length },
  );
  return { ok: true, id: input.id };
}

// --------------------------------------------------------------- labels ----

export type AdminLabelRow = {
  id: string;
  text: string;
  backgroundColor: string;
  textTone: "light" | "dark";
  isSystem: boolean;
  isActive: boolean;
  productIds: string[];
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function listAdminLabels(): Promise<AdminLabelRow[]> {
  if (!usesDatabase()) {
    return [];
  }
  const [rows, products] = await Promise.all([
    getPrisma().productLabelPreset.findMany({
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    }),
    getPrisma().product.findMany({
      where: { labelIds: { isEmpty: false } },
      select: { id: true, labelIds: true },
    }),
  ]);

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    backgroundColor: row.backgroundColor,
    textTone: row.textTone === "dark" ? "dark" : "light",
    isSystem: row.isSystem,
    isActive: row.isActive,
    productIds: products
      .filter((product) => product.labelIds.includes(row.id))
      .map((product) => product.id),
  }));
}

export async function getAdminLabelById(
  id: string,
): Promise<AdminLabelRow | null> {
  if (!usesDatabase()) {
    return null;
  }
  const row = await getPrisma().productLabelPreset.findUnique({
    where: { id },
  });
  if (!row) {
    return null;
  }
  const products = await getPrisma().product.findMany({
    where: { labelIds: { has: id } },
    select: { id: true },
  });
  return {
    id: row.id,
    text: row.text,
    backgroundColor: row.backgroundColor,
    textTone: row.textTone === "dark" ? "dark" : "light",
    isSystem: row.isSystem,
    isActive: row.isActive,
    productIds: products.map((product) => product.id),
  };
}

/**
 * Syncs `Product.labelIds` to match `productIds` for one label. `Product` has
 * no join table for labels (`labelIds` is a plain `String[]`), so this reads
 * every product currently carrying the label, diffs it against the requested
 * set, and applies only the additions/removals in one transaction — not a
 * full rewrite of every product's row.
 */
async function syncLabelProducts(
  labelId: string,
  productIds: string[],
): Promise<void> {
  const requested = new Set(productIds);
  const current = await getPrisma().product.findMany({
    where: { labelIds: { has: labelId } },
    select: { id: true, labelIds: true },
  });
  const currentIds = new Set(current.map((product) => product.id));

  const toDetach = current.filter((product) => !requested.has(product.id));
  const toAttachIds = productIds.filter((id) => !currentIds.has(id));
  if (toDetach.length === 0 && toAttachIds.length === 0) {
    return;
  }

  const toAttach =
    toAttachIds.length > 0
      ? await getPrisma().product.findMany({
          where: { id: { in: toAttachIds } },
          select: { id: true, labelIds: true },
        })
      : [];

  await getPrisma().$transaction([
    ...toDetach.map((product) =>
      getPrisma().product.update({
        where: { id: product.id },
        data: { labelIds: product.labelIds.filter((id) => id !== labelId) },
      }),
    ),
    ...toAttach.map((product) =>
      getPrisma().product.update({
        where: { id: product.id },
        data: { labelIds: [...product.labelIds, labelId] },
      }),
    ),
  ]);
}

export async function saveLabel(input: {
  id?: string;
  text: string;
  backgroundColor: string;
  textTone: string;
  isActive?: boolean;
  productIds?: string[];
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const text = input.text.replace(/[<>]/g, "").trim().slice(0, LABEL_TEXT_MAX);
  if (!text) {
    return fail("Enter label text.");
  }
  const backgroundColor = input.backgroundColor.trim();
  if (!HEX_COLOR.test(backgroundColor)) {
    return fail("Background colour must be a hex value like #1E88E5.");
  }
  const textTone = input.textTone === "dark" ? "dark" : "light";

  if (input.id) {
    const existing = await getPrisma().productLabelPreset.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!existing) {
      return fail("That label no longer exists.");
    }
  }

  const row = input.id
    ? await getPrisma().productLabelPreset.update({
        where: { id: input.id },
        data: {
          text,
          backgroundColor,
          textTone,
          ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
        },
        select: { id: true },
      })
    : await getPrisma().productLabelPreset.create({
        data: {
          text,
          backgroundColor,
          textTone,
          isActive: input.isActive ?? true,
        },
        select: { id: true },
      });

  if (input.productIds !== undefined) {
    await syncLabelProducts(row.id, input.productIds);
  }

  await audit(
    input.actor,
    input.id ? AUDIT_ACTIONS.LABEL_UPDATE : AUDIT_ACTIONS.LABEL_CREATE,
    "ProductLabelPreset",
    row.id,
    { text },
  );
  return { ok: true, id: row.id };
}

export async function setLabelActive(input: {
  id: string;
  isActive: boolean;
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const existing = await getPrisma().productLabelPreset.findUnique({
    where: { id: input.id },
    select: { id: true, text: true },
  });
  if (!existing) {
    return fail("That label no longer exists.");
  }
  await getPrisma().productLabelPreset.update({
    where: { id: input.id },
    data: { isActive: input.isActive },
  });
  await audit(
    input.actor,
    AUDIT_ACTIONS.LABEL_UPDATE,
    "ProductLabelPreset",
    input.id,
    { text: existing.text, isActive: input.isActive },
  );
  return { ok: true, id: input.id };
}

export async function deleteLabel(input: {
  id: string;
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const existing = await getPrisma().productLabelPreset.findUnique({
    where: { id: input.id },
    select: { id: true, isSystem: true, text: true },
  });
  if (!existing) {
    return fail("That label no longer exists.");
  }
  if (existing.isSystem) {
    return fail("System labels cannot be deleted.");
  }

  const attached = await getPrisma().product.findMany({
    where: { labelIds: { has: input.id } },
    select: { id: true, labelIds: true },
  });
  await getPrisma().$transaction([
    ...attached.map((product) =>
      getPrisma().product.update({
        where: { id: product.id },
        data: { labelIds: product.labelIds.filter((id) => id !== input.id) },
      }),
    ),
    getPrisma().productLabelPreset.delete({ where: { id: input.id } }),
  ]);

  await audit(
    input.actor,
    AUDIT_ACTIONS.LABEL_DELETE,
    "ProductLabelPreset",
    input.id,
    { text: existing.text, detachedFromProducts: attached.length },
  );
  return { ok: true, id: input.id };
}

// ------------------------------------------------------------- warranty ----

export type AdminWarrantyRow = {
  id: string;
  text: string;
  badge: string;
};

/**
 * `ProductWarranty` was already the real preset table (referenced by
 * `Product.warrantyId`); only the admin page was fake. `badge` is derived
 * from the label by the same helper the storefront uses, so it is not stored.
 */
export async function listAdminWarranties(): Promise<AdminWarrantyRow[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().productWarranty.findMany({
    where: { isActive: true },
    orderBy: { label: "asc" },
    select: { id: true, label: true },
  });
  return rows.map((row) => ({
    id: row.id,
    text: row.label,
    badge: warrantyBadgeFromLabel(row.label),
  }));
}

function warrantyCodeFromLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "warranty"
  );
}

export async function saveWarranty(input: {
  id?: string;
  text: string;
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const label = input.text
    .replace(/[<>]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, WARRANTY_LABEL_MAX);
  if (!label) {
    return fail("Enter a warranty label.");
  }

  if (input.id) {
    const existing = await getPrisma().productWarranty.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!existing) {
      return fail("That warranty no longer exists.");
    }
    const row = await getPrisma().productWarranty.update({
      where: { id: input.id },
      data: { label },
      select: { id: true },
    });
    await audit(
      input.actor,
      AUDIT_ACTIONS.WARRANTY_UPDATE,
      "ProductWarranty",
      row.id,
      { label },
    );
    return { ok: true, id: row.id };
  }

  // `code` is unique on the model — derive it and keep it stable.
  let code = warrantyCodeFromLabel(label);
  const clash = await getPrisma().productWarranty.findUnique({
    where: { code },
    select: { id: true },
  });
  if (clash) {
    code = `${code}-${Date.now().toString(36)}`;
  }

  const row = await getPrisma().productWarranty.create({
    data: { code, label, isActive: true },
    select: { id: true },
  });
  await audit(
    input.actor,
    AUDIT_ACTIONS.WARRANTY_CREATE,
    "ProductWarranty",
    row.id,
    { label, code },
  );
  return { ok: true, id: row.id };
}

/**
 * Soft delete: `Product.warrantyId` is a real FK with `onDelete: SetNull`, so a
 * hard delete would silently strip warranties from products. Deactivating keeps
 * existing product references intact while removing it from pickers.
 */
export async function deleteWarranty(input: {
  id: string;
  actor?: PresetActor;
}): Promise<PresetMutationResult> {
  if (!usesDatabase()) {
    return fail(PRESET_DB_REQUIRED);
  }
  const existing = await getPrisma().productWarranty.findUnique({
    where: { id: input.id },
    select: { id: true, label: true, isActive: true },
  });
  if (!existing) {
    return fail("That warranty no longer exists.");
  }
  const inUse = await getPrisma().product.count({
    where: { warrantyId: input.id },
  });
  await getPrisma().productWarranty.update({
    where: { id: input.id },
    data: { isActive: false },
  });
  await audit(
    input.actor,
    AUDIT_ACTIONS.WARRANTY_DELETE,
    "ProductWarranty",
    input.id,
    { label: existing.label, productsStillUsing: inUse },
  );
  return { ok: true, id: input.id };
}

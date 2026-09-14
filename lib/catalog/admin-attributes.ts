/**
 * Admin attribute persistence (P12-T03).
 *
 * ProductAttribute is the filter key definition. allowedValues is the admin
 * catalogue; storefront facets still read ProductAttributeValue on products.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  parseAttributeInput,
  type AttributeInputFields,
  type ParsedAttributeInput,
} from "@/lib/catalog/attribute-input";
import { getPrisma } from "@/lib/db/prisma";
import type { AdminAttribute } from "@/lib/admin/attributes-mock";

export const ATTRIBUTE_DB_REQUIRED =
  "Attribute changes need the database. Turn off DATA_SOURCE=mock to save.";

export type AttributeMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type AttributeActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) {
      continue;
    }
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
  }
  return out;
}

function toAdminAttribute(row: {
  id: string;
  key: string;
  label: string;
  isFilterable: boolean;
  position: number;
  allowedValues: string[];
  values: { value: string }[];
}): AdminAttribute {
  const fromProducts = uniqueValues(row.values.map((item) => item.value));
  return {
    id: row.id,
    name: row.label,
    key: row.key,
    values: row.allowedValues.length > 0 ? row.allowedValues : fromProducts,
    isFilterable: row.isFilterable,
    position: row.position,
  };
}

async function recordAttributeAudit(
  actor: AttributeActor | undefined,
  action: string,
  record: { id: string; key: string; name: string },
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!actor) {
    return;
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action,
    entityType: "ProductAttribute",
    entityId: record.id,
    ip: actor.ip,
    metadata: { key: record.key, name: record.name, ...metadata },
  });
}

export async function listAdminAttributeRecords(): Promise<AdminAttribute[]> {
  const rows = await getPrisma().productAttribute.findMany({
    orderBy: [{ position: "asc" }, { label: "asc" }],
    select: {
      id: true,
      key: true,
      label: true,
      isFilterable: true,
      position: true,
      allowedValues: true,
      values: { select: { value: true } },
    },
  });
  return rows.map(toAdminAttribute);
}

async function persistParsed(
  parsed: ParsedAttributeInput,
  currentId: string | undefined,
  actor?: AttributeActor,
): Promise<AttributeMutationResult> {
  const prisma = getPrisma();
  const keyTaken = await prisma.productAttribute.findUnique({
    where: { key: parsed.key },
    select: { id: true },
  });

  if (currentId) {
    const existing = await prisma.productAttribute.findUnique({
      where: { id: currentId },
      select: { id: true, key: true, label: true },
    });
    if (!existing) {
      return { ok: false, formError: "That attribute no longer exists." };
    }
    if (keyTaken && keyTaken.id !== existing.id) {
      return { ok: false, formError: "That attribute key is already in use." };
    }

    await prisma.productAttribute.update({
      where: { id: existing.id },
      data: {
        key: parsed.key,
        label: parsed.name,
        allowedValues: parsed.values,
        isFilterable: parsed.isFilterable,
        position: parsed.position,
      },
    });

    await recordAttributeAudit(
      actor,
      AUDIT_ACTIONS.ATTRIBUTE_UPDATE,
      {
        id: existing.id,
        key: parsed.key,
        name: parsed.name,
      },
      { valueCount: parsed.values.length },
    );
    return { ok: true, id: existing.id };
  }

  if (keyTaken) {
    return { ok: false, formError: "That attribute key is already in use." };
  }

  const created = await prisma.productAttribute.create({
    data: {
      key: parsed.key,
      label: parsed.name,
      allowedValues: parsed.values,
      isFilterable: parsed.isFilterable,
      position: parsed.position,
    },
    select: { id: true, key: true, label: true },
  });

  await recordAttributeAudit(
    actor,
    AUDIT_ACTIONS.ATTRIBUTE_CREATE,
    {
      id: created.id,
      key: created.key,
      name: created.label,
    },
    { valueCount: parsed.values.length },
  );
  return { ok: true, id: created.id };
}

export async function saveAdminAttribute(input: {
  currentId?: string;
  fields: AttributeInputFields;
  actor?: AttributeActor;
}): Promise<AttributeMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: ATTRIBUTE_DB_REQUIRED };
  }
  const parsed = parseAttributeInput(input.fields);
  if (!parsed.ok) {
    return parsed;
  }
  return persistParsed(parsed.value, input.currentId, input.actor);
}

export async function deleteAdminAttribute(input: {
  id: string;
  actor?: AttributeActor;
}): Promise<AttributeMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: ATTRIBUTE_DB_REQUIRED };
  }
  const id = input.id.trim();
  if (!id) {
    return { ok: false, formError: "That attribute no longer exists." };
  }

  const existing = await getPrisma().productAttribute.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      label: true,
      _count: { select: { values: true } },
    },
  });
  if (!existing) {
    return { ok: false, formError: "That attribute no longer exists." };
  }
  if (existing._count.values > 0) {
    return {
      ok: false,
      formError:
        "Remove this attribute from products before deleting the definition.",
    };
  }

  await getPrisma().productAttribute.delete({ where: { id: existing.id } });
  await recordAttributeAudit(
    input.actor,
    AUDIT_ACTIONS.ATTRIBUTE_DELETE,
    {
      id: existing.id,
      key: existing.key,
      name: existing.label,
    },
    {},
  );
  return { ok: true, id: existing.id };
}

export { usesCatalogDatabase };

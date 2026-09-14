/**
 * Real PC Builder settings — master enable switch + per-slot enabled/
 * required overrides (AD-275, wired live in Phase 8).
 *
 * `getEffectiveBuilderSlots()` is what the storefront builder and its
 * server-side add-to-cart/validation path actually read: it starts from the
 * static `BUILDER_SLOTS` catalogue and applies the admin's enabled/required
 * overrides on top, dropping any slot the admin disabled entirely. Every
 * caller defaults its `slots` parameter back to the static `BUILDER_SLOTS`
 * so the pure compatibility/domain functions stay testable without a DB.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { toDbBuilderSlot } from "@/lib/data/prisma/mappers";
import type { BuilderSlot } from "@/lib/data/types/catalog";
import { BUILDER_SLOTS, type BuilderSlotMeta } from "@/lib/domain/pc-builder/slots";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

export type AdminPcBuilderSlotSetting = {
  id: BuilderSlot;
  label: string;
  enabled: boolean;
  required: boolean;
};

export type AdminPcBuilderSettings = {
  enabled: boolean;
  slots: AdminPcBuilderSlotSetting[];
};

function defaults(): AdminPcBuilderSettings {
  return {
    enabled: true,
    slots: BUILDER_SLOTS.map((slot) => ({
      id: slot.id,
      label: slot.label,
      enabled: true,
      required: slot.required,
    })),
  };
}

export async function getAdminPcBuilderSettings(): Promise<AdminPcBuilderSettings> {
  if (!usesDatabase()) {
    return defaults();
  }
  const prisma = getPrisma();
  const [settingsRow, slotRows] = await Promise.all([
    prisma.pcBuilderSettings.findUnique({ where: { id: "singleton" } }),
    prisma.pcBuilderSlotConfig.findMany(),
  ]);

  const bySlot = new Map(slotRows.map((row) => [row.slot, row]));
  return {
    enabled: settingsRow?.enabled ?? true,
    slots: BUILDER_SLOTS.map((slot) => {
      const dbSlot = toDbBuilderSlot(slot.id);
      const row = bySlot.get(dbSlot);
      return {
        id: slot.id,
        label: slot.label,
        enabled: row?.enabled ?? true,
        required: row?.required ?? slot.required,
      };
    }),
  };
}

/** Whether the storefront builder should be reachable at all right now. */
export async function isPcBuilderEnabled(): Promise<boolean> {
  if (!usesDatabase()) {
    return true;
  }
  const row = await getPrisma().pcBuilderSettings.findUnique({
    where: { id: "singleton" },
    select: { enabled: true },
  });
  return row?.enabled ?? true;
}

/**
 * The slot list the live builder should actually use: disabled slots are
 * dropped entirely, and `required` reflects the admin override (falling
 * back to the static default when no override has been saved).
 */
export async function getEffectiveBuilderSlots(): Promise<BuilderSlotMeta[]> {
  const settings = await getAdminPcBuilderSettings();
  const bySlot = new Map(settings.slots.map((slot) => [slot.id, slot]));
  return BUILDER_SLOTS.filter((slot) => bySlot.get(slot.id)?.enabled !== false).map(
    (slot) => ({
      ...slot,
      required: bySlot.get(slot.id)?.required ?? slot.required,
    }),
  );
}

export type PcBuilderSettingsMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export async function savePcBuilderEnabled(input: {
  enabled: boolean;
  actor?: { staffId: string; email: string; ip?: string | null };
}): Promise<PcBuilderSettingsMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "PC Builder settings need the database. Turn off DATA_SOURCE=mock." };
  }
  await getPrisma().pcBuilderSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", enabled: input.enabled },
    update: { enabled: input.enabled },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.PC_BUILDER_SETTINGS_UPDATE,
      entityType: "PcBuilderSettings",
      entityId: "singleton",
      ip: input.actor.ip,
      metadata: { enabled: input.enabled },
    });
  }
  return { ok: true };
}

export async function savePcBuilderSlots(input: {
  slots: { id: string; enabled: boolean; required: boolean }[];
  actor?: { staffId: string; email: string; ip?: string | null };
}): Promise<PcBuilderSettingsMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "PC Builder settings need the database. Turn off DATA_SOURCE=mock." };
  }
  const knownIds = new Set(BUILDER_SLOTS.map((slot) => slot.id));
  for (const slot of input.slots) {
    if (!knownIds.has(slot.id as BuilderSlot)) {
      return { ok: false, formError: `Unknown slot "${slot.id}".` };
    }
  }

  const prisma = getPrisma();
  await prisma.$transaction(
    input.slots.map((slot) => {
      const dbSlot = toDbBuilderSlot(slot.id as BuilderSlot);
      return prisma.pcBuilderSlotConfig.upsert({
        where: { slot: dbSlot },
        create: { slot: dbSlot, enabled: slot.enabled, required: slot.required },
        update: { enabled: slot.enabled, required: slot.required },
      });
    }),
  );

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.PC_BUILDER_SETTINGS_UPDATE,
      entityType: "PcBuilderSlotConfig",
      entityId: "all",
      ip: input.actor.ip,
      metadata: { slotCount: input.slots.length },
    });
  }
  return { ok: true };
}

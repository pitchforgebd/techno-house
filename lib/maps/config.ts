/**
 * Google Maps enable flag (P16-T06).
 *
 * API keys stay in environment variables. Maps JS / Places wiring is deferred.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export type AdminGoogleMapConfig = {
  isEnabled: boolean;
  updatedAt: string | null;
};

export const MAP_DB_REQUIRED =
  "Google Map changes need the database. Turn off DATA_SOURCE=mock to save.";

export type MapMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type MapActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const EMPTY_ADMIN: AdminGoogleMapConfig = {
  isEnabled: false,
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): MapMutationResult {
  return { ok: false, formError };
}

export async function getAdminGoogleMapConfig(): Promise<AdminGoogleMapConfig> {
  if (!usesDatabase()) {
    return EMPTY_ADMIN;
  }
  const row = await getPrisma().googleMapConfiguration.findUnique({
    where: { id: "singleton" },
    select: { isEnabled: true, updatedAt: true },
  });
  if (!row) {
    return EMPTY_ADMIN;
  }
  return {
    isEnabled: row.isEnabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveGoogleMapConfig(input: {
  isEnabled: boolean;
  actor?: MapActor;
}): Promise<MapMutationResult> {
  if (!usesDatabase()) {
    return fail(MAP_DB_REQUIRED);
  }

  const row = await getPrisma().googleMapConfiguration.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      isEnabled: Boolean(input.isEnabled),
    },
    update: {
      isEnabled: Boolean(input.isEnabled),
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.GOOGLE_MAP_UPDATE,
      entityType: "GoogleMapConfiguration",
      entityId: row.id,
      metadata: { isEnabled: Boolean(input.isEnabled) },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}

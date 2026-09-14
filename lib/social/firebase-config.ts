/**
 * Firebase enable flag (P16-T05).
 *
 * Project credentials stay in environment variables.
 * Push / analytics wiring is deferred.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export type AdminFirebaseConfig = {
  isEnabled: boolean;
  updatedAt: string | null;
};

export const FIREBASE_DB_REQUIRED =
  "Firebase changes need the database. Turn off DATA_SOURCE=mock to save.";

export type FirebaseMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type FirebaseActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const EMPTY_ADMIN: AdminFirebaseConfig = {
  isEnabled: false,
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): FirebaseMutationResult {
  return { ok: false, formError };
}

export async function getAdminFirebaseConfig(): Promise<AdminFirebaseConfig> {
  if (!usesDatabase()) {
    return EMPTY_ADMIN;
  }
  const row = await getPrisma().firebaseConfiguration.findUnique({
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

export async function saveFirebaseConfig(input: {
  isEnabled: boolean;
  actor?: FirebaseActor;
}): Promise<FirebaseMutationResult> {
  if (!usesDatabase()) {
    return fail(FIREBASE_DB_REQUIRED);
  }

  const row = await getPrisma().firebaseConfiguration.upsert({
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
      action: AUDIT_ACTIONS.FIREBASE_UPDATE,
      entityType: "FirebaseConfiguration",
      entityId: row.id,
      metadata: { isEnabled: Boolean(input.isEnabled) },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}

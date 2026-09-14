/**
 * Custom Scripts — raw storefront head/body injection (AD-269).
 *
 * Content is stored and injected verbatim, unsanitized: sanitizing would
 * defeat the feature (third-party tracking/chat snippets are real
 * <script> tags). The real control is access — gated on
 * custom_scripts.manage, Admin role only. `DATA_SOURCE=mock` keeps
 * scripts off.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export const CUSTOM_SCRIPTS_DB_REQUIRED =
  "Custom scripts need the database. Turn off DATA_SOURCE=mock to save.";

/** Generous cap against accidental abuse/storage bloat — not a security control. */
export const CUSTOM_SCRIPT_MAX = 20000;

export type AdminCustomScripts = {
  headerScript: string;
  footerScript: string;
};

export type CustomScriptsMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type CustomScriptsActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const EMPTY: AdminCustomScripts = { headerScript: "", footerScript: "" };

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): CustomScriptsMutationResult {
  return { ok: false, formError };
}

export async function getAdminCustomScripts(): Promise<AdminCustomScripts> {
  if (!usesDatabase()) {
    return EMPTY;
  }
  const row = await getPrisma().customScriptSettings.findUnique({
    where: { id: "singleton" },
    select: { headerScript: true, footerScript: true },
  });
  if (!row) {
    return EMPTY;
  }
  return {
    headerScript: row.headerScript ?? "",
    footerScript: row.footerScript ?? "",
  };
}

/** Same source as the admin read — the storefront injector renders exactly this. */
export async function getStorefrontCustomScripts(): Promise<AdminCustomScripts> {
  return getAdminCustomScripts();
}

export async function saveCustomScripts(input: {
  headerScript: string;
  footerScript: string;
  actor?: CustomScriptsActor;
}): Promise<CustomScriptsMutationResult> {
  if (!usesDatabase()) {
    return fail(CUSTOM_SCRIPTS_DB_REQUIRED);
  }
  const headerScript = input.headerScript.trim();
  const footerScript = input.footerScript.trim();
  if (headerScript.length > CUSTOM_SCRIPT_MAX) {
    return fail(`Header script must be ${CUSTOM_SCRIPT_MAX} characters or fewer.`);
  }
  if (footerScript.length > CUSTOM_SCRIPT_MAX) {
    return fail(`Footer script must be ${CUSTOM_SCRIPT_MAX} characters or fewer.`);
  }

  await getPrisma().customScriptSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      headerScript: headerScript || null,
      footerScript: footerScript || null,
    },
    update: {
      headerScript: headerScript || null,
      footerScript: footerScript || null,
    },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.CUSTOM_SCRIPTS_UPDATE,
      entityType: "CustomScriptSettings",
      entityId: "singleton",
      metadata: {
        headerScriptLength: headerScript.length,
        footerScriptLength: footerScript.length,
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true };
}

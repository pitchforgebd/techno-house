/**
 * Social comment plugin settings (P16-T06).
 *
 * Persists enable, provider, and public app id. No raw scripts.
 * Plugin embed wiring is deferred.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  COMMENT_APP_ID_MAX,
  normalizeCommentAppId,
  normalizeCommentProvider,
  type AdminCommentSystemConfig,
} from "@/lib/comments/fields";

export type { AdminCommentSystemConfig } from "@/lib/comments/fields";

export const COMMENTS_DB_REQUIRED =
  "Comment settings need the database. Turn off DATA_SOURCE=mock to save.";

export type CommentsMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type CommentsActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const EMPTY_ADMIN: AdminCommentSystemConfig = {
  isEnabled: false,
  provider: "facebook",
  publicAppId: "",
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): CommentsMutationResult {
  return { ok: false, formError };
}

export async function getAdminCommentSystemConfig(): Promise<AdminCommentSystemConfig> {
  if (!usesDatabase()) {
    return EMPTY_ADMIN;
  }
  const row = await getPrisma().commentSystemConfiguration.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return EMPTY_ADMIN;
  }
  return {
    isEnabled: row.isEnabled,
    provider: normalizeCommentProvider(row.provider) ?? "facebook",
    publicAppId: row.publicAppId ?? "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveCommentSystemConfig(input: {
  isEnabled: boolean;
  provider: string;
  publicAppId: string;
  actor?: CommentsActor;
}): Promise<CommentsMutationResult> {
  if (!usesDatabase()) {
    return fail(COMMENTS_DB_REQUIRED);
  }
  const provider = normalizeCommentProvider(input.provider);
  if (provider == null) {
    return fail("Choose a supported comment provider.");
  }
  const publicAppId = normalizeCommentAppId(input.publicAppId);
  if (publicAppId == null) {
    return fail(
      `App id must be ${COMMENT_APP_ID_MAX} characters or fewer (letters, digits, ._-).`,
    );
  }

  const row = await getPrisma().commentSystemConfiguration.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      isEnabled: Boolean(input.isEnabled),
      provider,
      publicAppId: publicAppId || null,
    },
    update: {
      isEnabled: Boolean(input.isEnabled),
      provider,
      publicAppId: publicAppId || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.COMMENT_SYSTEM_UPDATE,
      entityType: "CommentSystemConfiguration",
      entityId: row.id,
      metadata: {
        isEnabled: Boolean(input.isEnabled),
        provider,
        hasAppId: Boolean(publicAppId),
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}

/**
 * Social login provider settings (P16-T05).
 *
 * Persists enable flag + public client/app id per provider.
 * Client secrets stay in environment variables.
 * Live OAuth sign-in is deferred.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import type { SocialLoginProvider as DbProvider } from "@/lib/generated/prisma/enums";
import {
  SOCIAL_CLIENT_ID_MAX,
  SOCIAL_LOGIN_PROVIDERS,
  normalizePublicClientId,
  normalizeSocialLoginProvider,
  type AdminSocialLoginConfig,
  type SocialLoginProviderId,
} from "@/lib/social/login-fields";

export type {
  AdminSocialLoginConfig,
  SocialLoginProviderId,
} from "@/lib/social/login-fields";

export const SOCIAL_DB_REQUIRED =
  "Social login changes need the database. Turn off DATA_SOURCE=mock to save.";

export type SocialMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type SocialActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): SocialMutationResult {
  return { ok: false, formError };
}

function emptyProvider(
  provider: SocialLoginProviderId,
): AdminSocialLoginConfig {
  return {
    provider,
    isEnabled: false,
    publicClientId: "",
    updatedAt: null,
  };
}

export async function getAdminSocialLoginConfigs(): Promise<
  AdminSocialLoginConfig[]
> {
  if (!usesDatabase()) {
    return SOCIAL_LOGIN_PROVIDERS.map((p) => emptyProvider(p.id));
  }
  const rows = await getPrisma().socialLoginConfiguration.findMany({
    select: {
      provider: true,
      isEnabled: true,
      publicClientId: true,
      updatedAt: true,
    },
  });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  return SOCIAL_LOGIN_PROVIDERS.map((meta) => {
    const row = byProvider.get(meta.id as DbProvider);
    if (!row) {
      return emptyProvider(meta.id);
    }
    return {
      provider: meta.id,
      isEnabled: row.isEnabled,
      publicClientId: row.publicClientId ?? "",
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function saveSocialLoginConfig(input: {
  provider: string;
  isEnabled: boolean;
  publicClientId: string;
  actor?: SocialActor;
}): Promise<SocialMutationResult> {
  if (!usesDatabase()) {
    return fail(SOCIAL_DB_REQUIRED);
  }
  const provider = normalizeSocialLoginProvider(input.provider);
  if (provider == null) {
    return fail("Choose a supported login provider.");
  }
  const publicClientId = normalizePublicClientId(input.publicClientId);
  if (publicClientId == null) {
    return fail(
      `Client / app id must be ${SOCIAL_CLIENT_ID_MAX} characters or fewer.`,
    );
  }

  const row = await getPrisma().socialLoginConfiguration.upsert({
    where: { provider: provider as DbProvider },
    create: {
      provider: provider as DbProvider,
      isEnabled: Boolean(input.isEnabled),
      publicClientId: publicClientId || null,
    },
    update: {
      isEnabled: Boolean(input.isEnabled),
      publicClientId: publicClientId || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.SOCIAL_LOGIN_UPDATE,
      entityType: "SocialLoginConfiguration",
      entityId: row.id,
      metadata: {
        provider,
        isEnabled: Boolean(input.isEnabled),
        hasClientId: Boolean(publicClientId),
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}

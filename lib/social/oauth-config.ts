/**
 * Which real OAuth2 sign-in provider is actually usable right now (Phase 9).
 *
 * "Do not enable a provider merely because its settings exist": a provider
 * is only active when the admin has (1) turned it on, (2) saved a client/app
 * id, AND (3) the matching client secret env var is actually set. Missing
 * any of the three means the sign-in button stays disabled — the DB toggle
 * alone is never enough.
 */
import { getAdminSocialLoginConfigs } from "@/lib/social/login-config";

export type OAuthProviderId = "GOOGLE" | "FACEBOOK";

const SECRET_ENV_VAR: Record<OAuthProviderId, string> = {
  GOOGLE: "SOCIAL_GOOGLE_CLIENT_SECRET",
  FACEBOOK: "SOCIAL_FACEBOOK_APP_SECRET",
};

export type ActiveOAuthProvider = {
  provider: OAuthProviderId;
  clientId: string;
  clientSecret: string;
};

export async function getActiveOAuthProvider(
  provider: OAuthProviderId,
): Promise<ActiveOAuthProvider | null> {
  const configs = await getAdminSocialLoginConfigs();
  const config = configs.find((c) => c.provider === provider);
  if (!config || !config.isEnabled || !config.publicClientId) {
    return null;
  }
  const secret = process.env[SECRET_ENV_VAR[provider]]?.trim();
  if (!secret) {
    return null;
  }
  return { provider, clientId: config.publicClientId, clientSecret: secret };
}

/** Which providers are actually usable — for rendering real vs. disabled buttons. */
export async function getUsableOAuthProviders(): Promise<
  Record<OAuthProviderId, boolean>
> {
  const [google, facebook] = await Promise.all([
    getActiveOAuthProvider("GOOGLE"),
    getActiveOAuthProvider("FACEBOOK"),
  ]);
  return { GOOGLE: google != null, FACEBOOK: facebook != null };
}

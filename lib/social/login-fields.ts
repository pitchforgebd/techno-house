export const SOCIAL_LOGIN_PROVIDERS = [
  {
    id: "GOOGLE",
    title: "Google Login",
    clientIdLabel: "Client ID",
    secretEnvHint: "SOCIAL_GOOGLE_CLIENT_SECRET",
  },
  {
    id: "FACEBOOK",
    title: "Facebook Login",
    clientIdLabel: "App ID",
    secretEnvHint: "SOCIAL_FACEBOOK_APP_SECRET",
  },
  {
    id: "TWITTER",
    title: "Twitter Login",
    clientIdLabel: "API Key",
    secretEnvHint: "SOCIAL_TWITTER_API_SECRET",
  },
  {
    id: "APPLE",
    title: "Apple Login",
    clientIdLabel: "Client ID",
    secretEnvHint: "SOCIAL_APPLE_CLIENT_SECRET",
  },
] as const;

export type SocialLoginProviderId =
  (typeof SOCIAL_LOGIN_PROVIDERS)[number]["id"];

export const SOCIAL_CLIENT_ID_MAX = 200;

export type AdminSocialLoginConfig = {
  provider: SocialLoginProviderId;
  isEnabled: boolean;
  publicClientId: string;
  updatedAt: string | null;
};

const PROVIDER_SET = new Set<string>(SOCIAL_LOGIN_PROVIDERS.map((p) => p.id));

function stripControlChars(raw: string): string {
  return raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeSocialLoginProvider(
  raw: string,
): SocialLoginProviderId | null {
  const value = raw.trim().toUpperCase();
  if (!PROVIDER_SET.has(value)) {
    return null;
  }
  return value as SocialLoginProviderId;
}

export function normalizePublicClientId(raw: string): string | null {
  const value = stripControlChars(raw);
  if (value.length > SOCIAL_CLIENT_ID_MAX) {
    return null;
  }
  return value;
}

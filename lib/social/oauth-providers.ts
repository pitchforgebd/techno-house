/**
 * Real OAuth2 authorization-code flow for Google and Facebook (Phase 9).
 * Twitter and Apple use non-standard flows (OAuth 1.0a / a JWT-generated
 * client secret) and are intentionally not built here — see TASK_STATE.md.
 */
import type { OAuthProviderId } from "@/lib/social/oauth-config";

export type OAuthProfile = {
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  fullName: string;
};

export type OAuthResult =
  | { ok: true; profile: OAuthProfile }
  | { ok: false; formError: string };

export function buildAuthorizationUrl(input: {
  provider: OAuthProviderId;
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  if (input.provider === "GOOGLE") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", input.clientId);
    url.searchParams.set("redirect_uri", input.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", input.state);
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", "email,public_profile");
  return url.toString();
}

async function exchangeGoogleCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<OAuthResult> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  } | null;
  if (!tokenResponse.ok || !tokenData?.access_token) {
    return {
      ok: false,
      formError: tokenData?.error_description || tokenData?.error || "Google sign-in failed.",
    };
  }

  const profileResponse = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
  );
  const profileData = (await profileResponse.json().catch(() => null)) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  } | null;
  if (!profileResponse.ok || !profileData?.sub) {
    return { ok: false, formError: "Could not read your Google profile." };
  }

  return {
    ok: true,
    profile: {
      providerAccountId: profileData.sub,
      email: profileData.email ?? null,
      emailVerified: Boolean(profileData.email_verified),
      fullName: profileData.name ?? "Customer",
    },
  };
}

async function exchangeFacebookCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<OAuthResult> {
  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", input.clientId);
  tokenUrl.searchParams.set("client_secret", input.clientSecret);
  tokenUrl.searchParams.set("redirect_uri", input.redirectUri);
  tokenUrl.searchParams.set("code", input.code);
  const tokenResponse = await fetch(tokenUrl.toString());
  const tokenData = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string;
    error?: { message?: string };
  } | null;
  if (!tokenResponse.ok || !tokenData?.access_token) {
    return {
      ok: false,
      formError: tokenData?.error?.message || "Facebook sign-in failed.",
    };
  }

  const profileUrl = new URL("https://graph.facebook.com/me");
  profileUrl.searchParams.set("fields", "id,name,email");
  profileUrl.searchParams.set("access_token", tokenData.access_token);
  const profileResponse = await fetch(profileUrl.toString());
  const profileData = (await profileResponse.json().catch(() => null)) as {
    id?: string;
    name?: string;
    email?: string;
    error?: { message?: string };
  } | null;
  if (!profileResponse.ok || !profileData?.id) {
    return {
      ok: false,
      formError: profileData?.error?.message || "Could not read your Facebook profile.",
    };
  }

  return {
    ok: true,
    profile: {
      providerAccountId: profileData.id,
      // Facebook's Graph API only ever returns an email it has confirmed —
      // there is no separate "verified" flag to check, unlike Google.
      email: profileData.email ?? null,
      emailVerified: Boolean(profileData.email),
      fullName: profileData.name ?? "Customer",
    },
  };
}

export async function exchangeAuthorizationCode(input: {
  provider: OAuthProviderId;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<OAuthResult> {
  if (input.provider === "GOOGLE") {
    return exchangeGoogleCode(input);
  }
  return exchangeFacebookCode(input);
}

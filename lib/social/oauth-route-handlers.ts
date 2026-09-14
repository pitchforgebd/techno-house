/**
 * Shared GET handlers for the two real OAuth2 sign-in routes per provider —
 * `/api/auth/social/<provider>` (start) and its `/callback` (Phase 9).
 * Errors never leak provider/internal details to the browser: every failure
 * redirects to `/account/login?error=social_*`.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeReturnPath } from "@/lib/account/return-path";
import { publicOrigin } from "@/lib/seo/public-origin";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getActiveOAuthProvider, type OAuthProviderId } from "@/lib/social/oauth-config";
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
} from "@/lib/social/oauth-providers";
import {
  completeSocialLogin,
  SOCIAL_LINK_REQUIRES_SIGN_IN,
} from "@/lib/social/oauth-login";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_SECONDS,
  createOAuthState,
  decodeOAuthStateCookie,
  encodeOAuthStateCookie,
} from "@/lib/social/oauth-state";

function redirectUriFor(provider: OAuthProviderId): string {
  return `${publicOrigin()}/api/auth/social/${provider.toLowerCase()}/callback`;
}

function loginErrorRedirect(reason: string): NextResponse {
  return NextResponse.redirect(
    `${publicOrigin()}/account/login?error=${encodeURIComponent(reason)}`,
  );
}

export async function startOAuthFlow(
  provider: OAuthProviderId,
  request: Request,
): Promise<NextResponse> {
  const active = await getActiveOAuthProvider(provider);
  if (!active) {
    return loginErrorRedirect("social_unavailable");
  }

  const url = new URL(request.url);
  const next = safeReturnPath(url.searchParams.get("next"), "/account");
  const state = createOAuthState();
  const authUrl = buildAuthorizationUrl({
    provider,
    clientId: active.clientId,
    redirectUri: redirectUriFor(provider),
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    encodeOAuthStateCookie({ state, next, provider }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: OAUTH_STATE_TTL_SECONDS,
      path: "/",
    },
  );
  return response;
}

export async function handleOAuthCallback(
  provider: OAuthProviderId,
  request: Request,
): Promise<NextResponse> {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const cookieStore = await cookies();
  const raw = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const saved = decodeOAuthStateCookie(raw);
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (providerError) {
    return loginErrorRedirect("social_denied");
  }
  if (!code || !stateParam || !saved || saved.provider !== provider || saved.state !== stateParam) {
    return loginErrorRedirect("social_invalid_state");
  }

  const active = await getActiveOAuthProvider(provider);
  if (!active) {
    return loginErrorRedirect("social_unavailable");
  }

  const exchanged = await exchangeAuthorizationCode({
    provider,
    code,
    clientId: active.clientId,
    clientSecret: active.clientSecret,
    redirectUri: redirectUriFor(provider),
  });
  if (!exchanged.ok) {
    return loginErrorRedirect("social_failed");
  }

  const meta = await getRequestMeta();
  // Resolved here, where there IS a request scope, and handed down explicitly.
  // A visitor already signed in to the matching account has proved control of
  // it, which is what makes linking safe (P0-01).
  const signedIn = await getCustomerSession();
  const completed = await completeSocialLogin({
    provider,
    profile: exchanged.profile,
    ip: meta.ip,
    userAgent: meta.userAgent,
    currentUserId: signedIn?.userId ?? null,
  });
  if (!completed.ok) {
    // This one is actionable by the visitor, so it must not be flattened into
    // the generic failure: the real account owner needs to be told to sign in
    // with their password first (P0-01).
    return loginErrorRedirect(
      completed.formError === SOCIAL_LINK_REQUIRES_SIGN_IN
        ? "social_link_required"
        : "social_failed",
    );
  }

  return NextResponse.redirect(`${publicOrigin()}${saved.next}`);
}

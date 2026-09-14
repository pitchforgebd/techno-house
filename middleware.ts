import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_PATH_HEADER } from "@/lib/auth/admin-path-header";
import {
  isAdminLoginAttemptPath,
  isAdminLoginPathname,
  adminLoginPath,
} from "@/lib/auth/admin-login-path";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/customer-session-constants";
import { verifySessionJwt } from "@/lib/auth/session-jwt";
import { STAFF_SESSION_COOKIE } from "@/lib/auth/staff-session-constants";

const ACCOUNT_PUBLIC = new Set([
  "/account/login",
  "/account/register",
  "/account/forgot-password",
]);

/** Wholesale pages reachable without a session. */
const B2B_PUBLIC = new Set(["/b2b/login", "/b2b/register"]);

/**
 * Real JWT signature + expiry check (Edge runtime, via `jose` — no DB
 * access here, same as before). This rejects a tampered or expired cookie
 * immediately instead of only checking that it looks token-shaped. Full
 * validation (revocation, permissions, account status) still runs in
 * getCustomerSession / getStaffSession on the server.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Real gate is public. Wrong / legacy login URLs fall through to
    // notFound() pages — never redirect them to the real slug.
    if (
      isAdminLoginPathname(pathname) ||
      isAdminLoginAttemptPath(pathname)
    ) {
      return NextResponse.next();
    }
    const jwt = request.cookies.get(STAFF_SESSION_COOKIE)?.value?.trim();
    const token = jwt ? await verifySessionJwt(jwt) : null;
    if (!token) {
      const login = new URL(adminLoginPath(), request.url);
      const next = `${pathname}${request.nextUrl.search}`;
      login.searchParams.set("next", next);
      return NextResponse.redirect(login);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(ADMIN_PATH_HEADER, pathname);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Wholesale pages each call `getCustomerSession()` themselves and every one
  // of the twelve does so correctly — but `/account` and `/admin` also get this
  // structural gate, and `/b2b` did not (F-10). The panel exposes negotiated
  // pricing and order history, so a page added later without its own guard
  // should fail closed rather than be silently public.
  const isB2B = pathname === "/b2b" || pathname.startsWith("/b2b/");
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");
  if (!isAccount && !isB2B) {
    return NextResponse.next();
  }

  if (ACCOUNT_PUBLIC.has(pathname) || B2B_PUBLIC.has(pathname)) {
    return NextResponse.next();
  }

  const jwt = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value?.trim();
  const token = jwt ? await verifySessionJwt(jwt) : null;
  if (!token) {
    // Send wholesale visitors to the wholesale gate, so they land where the
    // rest of that panel expects them.
    const login = new URL(isB2B ? "/b2b/login" : "/account/login", request.url);
    const next =
      pathname === "/account" || pathname === "/b2b"
        ? pathname
        : `${pathname}${request.nextUrl.search}`;
    login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/b2b/:path*"],
};

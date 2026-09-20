import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_PATH_HEADER } from "@/lib/auth/admin-path-header";
import {
  isAdminLoginAttemptPath,
  isAdminLoginPathname,
  adminLoginPath,
} from "@/lib/auth/admin-login-path";
import { canAccessAdminPath } from "@/lib/auth/admin-route-permissions";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/customer-session-constants";
import { verifySessionJwt } from "@/lib/auth/session-jwt";
import { resolveStaffSessionByToken } from "@/lib/auth/staff-session-core";
import { STAFF_SESSION_COOKIE } from "@/lib/auth/staff-session-constants";

/**
 * Node.js runtime, not the Edge default — this is what actually closes the
 * permission gap. `app/(admin)/admin/(panel)/layout.tsx` used to be the only
 * enforcement point, but Next.js App Router does not re-run a shared layout
 * on client-side navigation between sibling routes under it — only the leaf
 * `page.tsx` segment changes ("partial rendering"). A staff member without
 * `orders.view_all` who reached `/admin/orders` via *any* in-app link
 * (client-side navigation never revisits the layout, so its permission
 * check never re-fired) saw the page render anyway — the sidebar correctly
 * hid the Orders link, but that is presentation, not enforcement, and a
 * second, unfiltered link (`ADMIN_DASHBOARD_TABS`, fixed separately in
 * `admin-chrome.ts`) reached it regardless. Middleware runs on every
 * request, including the fetch Next.js makes for a soft navigation, so it
 * is the one place a check is guaranteed to re-run every time. Needs the
 * Node runtime because permissions are deliberately never cached in the JWT
 * (see `session-jwt.ts`) — this does the same fresh Postgres read the
 * layout always did, just somewhere that cannot be skipped.
 */
export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/b2b/:path*"],
  runtime: "nodejs",
} as const;

const ACCOUNT_PUBLIC = new Set([
  "/account/login",
  "/account/register",
  "/account/forgot-password",
]);

/** Wholesale pages reachable without a session. */
const B2B_PUBLIC = new Set(["/b2b/login", "/b2b/register"]);

/**
 * JWT signature + expiry check first (rejects a tampered or expired cookie
 * immediately without a DB round trip), then for `/admin` a real,
 * always-fresh permission check against Postgres — see the module comment
 * above for why this has to live here and not only in the panel layout.
 * `getStaffSession()` on the server still runs its own copy of this same
 * lookup (React `cache()`-deduped per request, so this is not a second
 * query on top of it) — that duplication is deliberate: middleware is the
 * enforcement point that cannot be skipped, the server-side call is what
 * page/layout code actually reads the session data from.
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

    const session = await resolveStaffSessionByToken(token);
    if (!session) {
      // Signature/expiry checked out, but the DB session is gone —
      // revoked, expired, or the staff account was deactivated since the
      // JWT was issued. Same destination as no cookie at all.
      const login = new URL(adminLoginPath(), request.url);
      const next = `${pathname}${request.nextUrl.search}`;
      login.searchParams.set("next", next);
      return NextResponse.redirect(login);
    }

    if (
      pathname !== "/admin/forbidden" &&
      !canAccessAdminPath(pathname, session.permissions)
    ) {
      return NextResponse.redirect(new URL("/admin/forbidden", request.url));
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

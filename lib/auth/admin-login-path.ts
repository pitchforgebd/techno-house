/**
 * Obscured staff sign-in path (AD-208).
 *
 * The panel stays under `/admin/*`. Login is only at
 * `/admin/access/{ADMIN_LOGIN_SLUG}` so the obvious `/admin/login` URL
 * does not advertise the gate. Change the slug in production.
 *
 * **Server and middleware only.** `ADMIN_LOGIN_SLUG` has no `NEXT_PUBLIC_`
 * prefix, so it is not exposed to the browser bundle — a Client Component
 * calling this would read `undefined` and, in production, throw. That is the
 * correct outcome (the slug should not ship to every visitor) but it makes the
 * call site the wrong place to find out. Pass the result down as a prop.
 * Prefer `adminLoginPath()` over hardcoding the path.
 */

const DEFAULT_SLUG = "th-ops-local";
const SLUG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{7,63}$/;

export function isValidAdminLoginSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/**
 * Resolved login slug.
 *
 * In development this falls back to `DEFAULT_SLUG` so a fresh checkout works
 * with no configuration. In production it throws instead (F-14): the default
 * is published in `.env.example`, in `docs/`, and in this repository's history,
 * so a deploy that forgets the variable gets a gate whose address is public
 * knowledge — and gets it *silently*, which is the part that matters.
 *
 * Failing loudly matches how `SESSION_JWT_SECRET` already behaves. The slug is
 * obscurity rather than a control — the password, rate limit and lockout are
 * the real defences — but obscurity that the operator believes they have and
 * do not is worse than none.
 */
export function getAdminLoginSlug(): string {
  const raw = process.env.ADMIN_LOGIN_SLUG?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (raw && isValidAdminLoginSlug(raw)) {
    // Shape is not enough. The original F-14 guard rejected a *missing* slug
    // but accepted any well-formed one — including `DEFAULT_SLUG`, which is
    // printed in `.env.example`, in `docs/`, and in this file. Copying the
    // example file is the normal way to configure a deployment, so the likely
    // production mistake was never the forgotten variable that guard caught;
    // it was the copied one, which sailed through as "valid" and put the gate
    // at a published address.
    //
    // Checked here rather than in the example file because a comment cannot
    // enforce anything, and this failure is silent by nature: the panel works
    // perfectly, so nothing ever prompts the operator to look.
    if (isProduction && raw === DEFAULT_SLUG) {
      throw new Error(
        "ADMIN_LOGIN_SLUG is still the published development default. It " +
          "appears in .env.example and in this repository's history, so the " +
          "staff sign-in path would be public knowledge. Set a different " +
          "value before deploying.",
      );
    }
    return raw;
  }

  if (isProduction) {
    throw new Error(
      "ADMIN_LOGIN_SLUG is not set (or is not 8-64 characters of letters, " +
        "numbers, _ or -). Production must not fall back to the published " +
        "default. Set it in the environment before deploying.",
    );
  }
  return DEFAULT_SLUG;
}

/** Canonical staff sign-in href, optionally with a post-login `next` path. */
export function adminLoginPath(next?: string | null): string {
  const base = `/admin/access/${getAdminLoginSlug()}`;
  if (!next) {
    return base;
  }
  const trimmed = next.trim();
  if (!trimmed) {
    return base;
  }
  return `${base}?next=${encodeURIComponent(trimmed)}`;
}

/** True only for the configured login URL (not other `/admin/access/*` guesses). */
export function isAdminLoginPathname(pathname: string): boolean {
  return pathname === `/admin/access/${getAdminLoginSlug()}`;
}

/**
 * Paths that look like a login attempt. Wrong slugs and legacy `/admin/login`
 * should 404 rather than redirect to the real gate.
 */
export function isAdminLoginAttemptPath(pathname: string): boolean {
  return pathname === "/admin/login" || pathname.startsWith("/admin/access/");
}

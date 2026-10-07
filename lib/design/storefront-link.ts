/**
 * Which storefront pages an operator-typed link can point at (AD-368).
 *
 * A home banner's link used to be accepted if it merely started with "/". Three
 * banners were saved with links like "/DHFH" — pages that do not exist — and every
 * visitor's browser then logged a 404 for each of them (the storefront prefetches
 * links it can see) while a click led to the not-found page. This module is the
 * one place that knows what a real storefront path looks like, so the Design Studio
 * can refuse a link to nowhere with a clear message when it is saved.
 *
 * Pure and free of the database so it is testable; whether a particular product,
 * category or brand slug exists is a separate lookup that the caller makes with
 * the `kind` and `slug` this returns. The two lists below mirror the page folders
 * under `app/(storefront)`; `npm run test:storefront-links` compares them with the
 * folders, so adding a page without adding it here fails the build's test run
 * rather than silently rejecting links to the new page.
 */

/** Paths (without the leading slash) of storefront pages with a fixed address. */
export const STOREFRONT_STATIC_PATHS: readonly string[] = [
  "about",
  "account",
  "account/addresses",
  "account/builds",
  "account/compare",
  "account/forgot-password",
  "account/login",
  "account/notifications",
  "account/orders",
  "account/profile",
  "account/questions",
  "account/register",
  "account/reviews",
  "account/tickets",
  "account/wishlist",
  "b2b",
  "b2b/addresses",
  "b2b/login",
  "b2b/login-details",
  "b2b/notifications",
  "b2b/orders",
  "b2b/pricing",
  "b2b/profile",
  "b2b/register",
  "b2b/support",
  "blog",
  "brands",
  "cart",
  "checkout",
  "checkout/confirmation",
  "checkout/payment/return",
  "compare",
  "complaint",
  "contact",
  "deals",
  "digital-commerce-guideline",
  "faq",
  "flash-sale",
  "offers",
  "pc-builder",
  "privacy",
  "product-request",
  "returns",
  "search",
  "shipping",
  "shop",
  "support",
  "terms",
  "track",
  "warranty",
  "wishlist",
];

/** Prefixes (without slashes) whose pages take exactly one more segment: `/product/<slug>`. */
export const STOREFRONT_DYNAMIC_PREFIXES: readonly string[] = [
  "account/orders",
  "account/tickets",
  "b2b/orders",
  "b2b/support",
  "blog",
  "brand",
  "category",
  "offers",
  "pc-builder/select",
  "pc-builder/share",
  "product",
  "track",
];

export type StorefrontLinkCheck =
  | {
      ok: true;
      /** The path without query or hash, no trailing slash ("/" for the home page). */
      path: string;
      /** Set for `/product/<slug>`, `/category/<slug>` and `/brand/<slug>`, which the caller can look up. */
      kind: "product" | "category" | "brand" | null;
      slug: string | null;
    }
  | { ok: false; message: string };

const EXAMPLES = "like /shop, /deals, /category/laptops or /product/your-product-slug";

/**
 * Checks that `href` is a link to a real storefront page. A query string or hash
 * after the path is allowed and ignored (`/shop?brand=msi#top`).
 */
export function checkStorefrontLink(href: string): StorefrontLinkCheck {
  const value = href.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return { ok: false, message: `Link must be a path on this site starting with a single / — ${EXAMPLES}.` };
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 92 || code === 127) {
      return { ok: false, message: "Link cannot contain spaces or backslashes." };
    }
  }
  const beforeHash = value.split("#")[0] ?? "";
  const beforeQuery = beforeHash.split("?")[0] ?? "";
  const trimmed = beforeQuery.length > 1 && beforeQuery.endsWith("/") ? beforeQuery.slice(0, -1) : beforeQuery;
  if (trimmed === "/") {
    return { ok: true, path: "/", kind: null, slug: null };
  }
  const relative = trimmed.slice(1);
  if (STOREFRONT_STATIC_PATHS.includes(relative)) {
    return { ok: true, path: trimmed, kind: null, slug: null };
  }
  for (const prefix of STOREFRONT_DYNAMIC_PREFIXES) {
    if (!relative.startsWith(`${prefix}/`)) {
      continue;
    }
    const rest = relative.slice(prefix.length + 1);
    if (rest !== "" && !rest.includes("/")) {
      const kind = prefix === "product" || prefix === "category" || prefix === "brand" ? prefix : null;
      return { ok: true, path: trimmed, kind, slug: kind ? decodeSlug(rest) : null };
    }
  }
  return { ok: false, message: `There is no page at ${trimmed}. Use a link to a page that exists, ${EXAMPLES}.` };
}

function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

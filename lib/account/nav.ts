export type AccountNavItem = {
  href: string;
  label: string;
  /** Key into the icon map in `account-nav.tsx`. */
  icon:
    | "overview"
    | "orders"
    | "addresses"
    | "wishlist"
    | "compare"
    | "reviews"
    | "questions"
    | "support"
    | "notifications"
    | "profile"
    | "wholesale"
    | "pricing";
};

export const ACCOUNT_NAV: readonly AccountNavItem[] = [
  { href: "/account", label: "Overview", icon: "overview" },
  { href: "/account/orders", label: "Orders", icon: "orders" },
  { href: "/account/addresses", label: "Addresses", icon: "addresses" },
  { href: "/account/wishlist", label: "Wishlist", icon: "wishlist" },
  { href: "/account/compare", label: "Compare", icon: "compare" },
  { href: "/account/reviews", label: "Reviews", icon: "reviews" },
  { href: "/account/questions", label: "Questions", icon: "questions" },
  { href: "/account/tickets", label: "Support", icon: "support" },
  {
    href: "/account/notifications",
    label: "Notifications",
    icon: "notifications",
  },
  { href: "/account/profile", label: "Profile", icon: "profile" },
] as const;

/**
 * The wholesale panel's own nav.
 *
 * These are `/b2b/*` routes, not the retail `/account/*` ones: a wholesale
 * buyer following "Orders" should land on their wholesale orders page, not
 * be dropped into the customer panel. Wishlist, Compare, Reviews and
 * Questions are deliberately absent — they are retail shopper features and a
 * trade buyer has no use for them.
 */
export const B2B_PANEL_NAV: readonly AccountNavItem[] = [
  { href: "/b2b", label: "Overview", icon: "overview" },
  { href: "/b2b/orders", label: "Orders", icon: "orders" },
  { href: "/b2b/pricing", label: "My price list", icon: "pricing" },
  { href: "/b2b/addresses", label: "Addresses", icon: "addresses" },
  { href: "/b2b/support", label: "Support", icon: "support" },
  { href: "/b2b/notifications", label: "Notifications", icon: "notifications" },
  { href: "/b2b/profile", label: "Wholesale account", icon: "wholesale" },
] as const;

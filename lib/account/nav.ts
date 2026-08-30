export type AccountNavItem = {
  href: string;
  label: string;
};

export const ACCOUNT_NAV: readonly AccountNavItem[] = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/compare", label: "Compare" },
  { href: "/account/reviews", label: "Reviews" },
  { href: "/account/questions", label: "Questions" },
  { href: "/account/tickets", label: "Support" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/profile", label: "Profile" },
] as const;

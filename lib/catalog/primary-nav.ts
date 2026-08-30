export const PRIMARY_NAV_START = [{ href: "/", label: "Home" }] as const;

export const PRIMARY_NAV_END: ReadonlyArray<{ href: string; label: string }> =
  [];

export const HEADER_BUILDER_LINK = {
  href: "/pc-builder",
  label: "PC Builder",
} as const;

export const HEADER_LIST_LINKS = [
  { href: "/wishlist", label: "Wishlist" },
  { href: "/compare", label: "Compare" },
] as const;

export const UTILITY_BAR_CONTACT = [
  { href: "/support", label: "Support 9:00–22:00" },
  { href: "/contact", label: "Contact" },
] as const;

export const UTILITY_BAR_LINKS = [
  { href: "/support", label: "Help" },
  { href: "/offers", label: "Offers" },
  { href: "/shop?sort=newest", label: "New arrivals" },
  { href: "/brands", label: "Brands" },
] as const;

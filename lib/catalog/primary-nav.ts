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

/** Display-only defaults; live values come from SiteSettings via getStorefrontBranding. */
export const STORE_CONTACT = {
  phone: "+880 9612-000000",
  phoneHref: "tel:+8809612000000",
  email: "support@techno-house.demo",
} as const;

export type UtilityBarIcon =
  | "phone"
  | "mail"
  | "support"
  | "offers"
  | "new"
  | "brands";

/** Single centered utility row above the header (desktop). */
export const UTILITY_BAR_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  icon: UtilityBarIcon;
  external?: boolean;
}> = [
  {
    href: STORE_CONTACT.phoneHref,
    label: STORE_CONTACT.phone,
    icon: "phone",
    external: true,
  },
  {
    href: `mailto:${STORE_CONTACT.email}`,
    label: STORE_CONTACT.email,
    icon: "mail",
    external: true,
  },
  { href: "/support", label: "Customer service", icon: "support" },
  { href: "/offers", label: "Offers", icon: "offers" },
  { href: "/shop?sort=newest", label: "New arrivals", icon: "new" },
  { href: "/brands", label: "Brands", icon: "brands" },
];

export const UTILITY_BAR_LINKS = [
  { href: "/support", label: "Help" },
  { href: "/offers", label: "Offers" },
  { href: "/shop?sort=newest", label: "New arrivals" },
  { href: "/brands", label: "Brands" },
] as const;

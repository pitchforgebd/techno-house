export const FOOTER_COMPANY_LINKS = [
  { href: "/about", label: "About us" },
  { href: "/brands", label: "Brands" },
  { href: "/warranty", label: "Warranty" },
  { href: "/support", label: "Support" },
  { href: "/offers", label: "Offers & EMI" },
  { href: "/faq", label: "FAQ" },
  { href: "/pc-builder", label: "PC Builder" },
  { href: "/shop", label: "Shop" },
] as const;

export const FOOTER_POLICY_LINKS = [
  { href: "/shipping", label: "Order & shipping" },
  { href: "/returns", label: "Return & refund" },
  { href: "/checkout", label: "Payment methods" },
  { href: "/terms", label: "Terms & conditions" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/product-request", label: "Request a product" },
  { href: "/contact", label: "Report a problem" },
] as const;

/** Placeholder destinations — real social embeds wait for later phases. */
export const FOOTER_SOCIAL = [
  { href: "/contact", label: "Facebook" },
  { href: "/contact", label: "X" },
  { href: "/contact", label: "YouTube" },
  { href: "/contact", label: "Instagram" },
  { href: "/contact", label: "LinkedIn" },
] as const;

/** @deprecated Prefer FOOTER_COMPANY_LINKS / FOOTER_POLICY_LINKS. */
export const FOOTER_COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/offers", label: "Offers" },
      { href: "/pc-builder", label: "PC Builder" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/support", label: "Support" },
      { href: "/product-request", label: "Request a product" },
      { href: "/faq", label: "FAQ" },
      { href: "/warranty", label: "Warranty" },
      { href: "/shipping", label: "Shipping" },
      { href: "/returns", label: "Returns" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

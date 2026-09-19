/**
 * Storefront footer widget config (AD-230).
 *
 * Persisted as JSON on `FooterSettings` singleton. Missing DB row falls back
 * to the previous hard-coded Techno House footer IA.
 */
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_POLICY_LINKS,
  FOOTER_SOCIAL,
} from "@/lib/catalog/footer-nav";

export type FooterNavLink = {
  id: string;
  label: string;
  href: string;
};

export type FooterNavColumn = {
  id: string;
  title: string;
  links: FooterNavLink[];
};

export type FooterSocialNetwork =
  | "Facebook"
  | "X"
  | "YouTube"
  | "Instagram"
  | "LinkedIn";

export type FooterSocialItem = {
  id: string;
  network: FooterSocialNetwork;
  href: string;
};

export type FooterWidgetsConfig = {
  aboutDescription: string;
  showSocial: boolean;
  socialLinks: FooterSocialItem[];
  columns: FooterNavColumn[];
  contactHours: string;
  showContactFormLink: boolean;
  showCtaButtons: boolean;
  showNewsletter: boolean;
  showTrackForm: boolean;
  playStoreEnabled: boolean;
  playStoreUrl: string;
  copyrightText: string;
  paymentMethodsImageSrc: string;
  subFooterEnabled: boolean;
  subFooterTitle: string;
  subFooterDescription: string;
};

function id(prefix: string, seed: string): string {
  return `${prefix}-${seed.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

export const FOOTER_SOCIAL_NETWORKS: FooterSocialNetwork[] = [
  "Facebook",
  "X",
  "YouTube",
  "Instagram",
  "LinkedIn",
];

export function defaultFooterWidgetsConfig(): FooterWidgetsConfig {
  return {
    aboutDescription:
      "Technology for work, study, and building a PC. Prices in ৳.",
    showSocial: true,
    socialLinks: FOOTER_SOCIAL.map((item) => ({
      id: id("social", item.label),
      network: item.label as FooterSocialNetwork,
      href: item.href,
    })),
    columns: [
      {
        id: "col-company",
        title: "Company",
        links: FOOTER_COMPANY_LINKS.map((item) => ({
          id: id("link", item.label),
          label: item.label,
          href: item.href,
        })),
      },
      {
        id: "col-policies",
        title: "Policies",
        links: FOOTER_POLICY_LINKS.map((item) => ({
          id: id("link", `${item.label}-${item.href}`),
          label: item.label,
          href: item.href,
        })),
      },
    ],
    contactHours: "Hours 9:00–22:00",
    showContactFormLink: true,
    showCtaButtons: true,
    showNewsletter: true,
    showTrackForm: true,
    playStoreEnabled: false,
    playStoreUrl: "",
    copyrightText:
      "© {year} {storeName}. All rights reserved.\nPrices and stock may change without notice. Figures shown in ৳ (BDT) are for display and are not a charge.",
    paymentMethodsImageSrc: "",
    subFooterEnabled: false,
    subFooterTitle: "",
    subFooterDescription: "",
  };
}

export function formatFooterCopyright(
  template: string,
  input: { year: number; storeName: string },
): string[] {
  const text = template
    .replaceAll("{year}", String(input.year))
    .replaceAll("{storeName}", input.storeName)
    .trim();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

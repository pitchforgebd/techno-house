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
  /** Fixed-bottom scrolling notice bar shown on every storefront page. */
  marqueeEnabled: boolean;
  /** Sanitized rich HTML (bold/italic/links) — plain text is valid HTML too,
   * so content saved before AD-378 round-trips unchanged. */
  marqueeText: string;
  /** Full pass duration in seconds — lower is faster. */
  marqueeSpeedSeconds: number;
  /** Admin-configured ceiling on the notice's visible length. */
  marqueeMaxChars: number;
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

/** Matches the hardcoded `.th-marquee-track` CSS duration this replaces, so
 * a site that never touches the new field keeps its current speed. */
export const DEFAULT_MARQUEE_SPEED_SECONDS = 14;
export const MARQUEE_SPEED_MIN = 4;
export const MARQUEE_SPEED_MAX = 60;

export const DEFAULT_MARQUEE_MAX_CHARS = 200;
export const MARQUEE_MAX_CHARS_MIN = 20;
export const MARQUEE_MAX_CHARS_MAX = 500;

export function clampMarqueeSpeedSeconds(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return DEFAULT_MARQUEE_SPEED_SECONDS;
  }
  return Math.min(MARQUEE_SPEED_MAX, Math.max(MARQUEE_SPEED_MIN, Math.round(value)));
}

/** Visible character count, ignoring markup — what `marqueeMaxChars` limits. */
export function marqueePlainTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, "").trim().length;
}

export function clampMarqueeMaxChars(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return DEFAULT_MARQUEE_MAX_CHARS;
  }
  return Math.min(
    MARQUEE_MAX_CHARS_MAX,
    Math.max(MARQUEE_MAX_CHARS_MIN, Math.round(value)),
  );
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
    marqueeEnabled: false,
    marqueeText: "",
    marqueeSpeedSeconds: DEFAULT_MARQUEE_SPEED_SECONDS,
    marqueeMaxChars: DEFAULT_MARQUEE_MAX_CHARS,
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

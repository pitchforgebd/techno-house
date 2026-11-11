import type { ReactNode } from "react";
import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Inter,
  Noto_Sans_Bengali,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { publicOrigin } from "@/lib/seo/public-origin";
import { getLanguageSettings } from "@/lib/business/language-config";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

// `preload: false`: only `font-mono` text (a SKU on the product page, order
// codes, admin tables) uses it, so it is fetched when such text renders rather
// than preloaded on every page, including the ones that never show any.
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  preload: false,
});

/**
 * Declared here so Admin → Design Studio → Typography can switch the real
 * storefront body/heading font (AD-272) without a runtime font-loader —
 * next/font requires static imports, so every selectable font is declared
 * once and picked by CSS variable in the storefront layout.
 *
 * `preload: false` on the two that are only ever an opt-in choice. A preload
 * is fetched whether or not any text uses the family, and neither is in the
 * default `--font-sans` stack, so on a store that has not picked them they
 * cost every visitor about 180 KB (Inter 49 KB, Noto Sans Bengali 133 KB) for
 * nothing: a browser check of home, a category and a product page showed zero
 * glyphs drawn by either. (The taka sign is drawn by the system's Bengali
 * font, e.g. Nirmala UI, not by the Noto web font.) Their @font-face rules are
 * still emitted: a browser downloads a face only when text actually uses it,
 * so choosing one in Design Studio keeps working (it loads on demand, with
 * `swap`).
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: false,
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--font-noto-bengali",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(publicOrigin()),
  title: "Techno House",
  description: "Technology products for work, study, and building a PC.",
  // Renders <meta name="google-site-verification" content="..." /> as a
  // real child of <head> — the Admin -> Custom Script fields can't do this
  // themselves, since both the "header" and "footer" slots there render
  // into <body> (CustomScriptSlot), not <head>, so Google's HTML-tag
  // verification can never pass through them.
  verification: {
    google: "gQ4KIysQDsv4jmS0p5-k_GH298fiDoRoy3RW__TmppA",
  },
};

/**
 * Meta (Business Manager) domain verification for technohouse.com.bd.
 * Rendered as a literal <head> child below rather than via `metadata`:
 * Next streams metadata into <body> for ordinary browsers when a layout has
 * an async generateMetadata (the storefront layout does), and the admin
 * Custom Script header slot renders into <body> too. A static tag in the
 * root layout's <head> is in the first HTML chunk for every user agent.
 */
const FACEBOOK_DOMAIN_VERIFICATION = "pcdiafrmqwfmg9rvylf7pakjntij0o";

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const languages = await getLanguageSettings();
  const defaultLanguage = languages.find((lang) => lang.isDefault) ?? languages[0];

  return (
    <html
      lang={defaultLanguage?.code ?? "en"}
      dir={defaultLanguage?.rtl ? "rtl" : "ltr"}
      className={`${plusJakarta.variable} ${ibmPlexMono.variable} ${inter.variable} ${notoSansBengali.variable}`}
    >
      <head>
        <meta
          name="facebook-domain-verification"
          content={FACEBOOK_DOMAIN_VERIFICATION}
        />
      </head>
      <body
        className="bg-background font-sans text-text antialiased"
        suppressHydrationWarning
      >
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}

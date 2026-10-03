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

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

/**
 * Pre-loaded so Admin → Design Studio → Typography can switch the real
 * storefront body/heading font (AD-272) without a runtime font-loader —
 * next/font requires static imports, so every selectable font is loaded
 * here once and picked by CSS variable in the storefront layout.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--font-noto-bengali",
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
      <body
        className="bg-background font-sans text-text antialiased"
        suppressHydrationWarning
      >
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}

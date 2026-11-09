import type { Metadata } from "next";
import { PcBuilderShell } from "@/features/pc-builder/pc-builder-shell";
import { PcBuilderUnavailable } from "@/features/pc-builder/pc-builder-unavailable";
import { isPcBuilderEnabled } from "@/lib/pc-builder/settings";
import { staticPageMetadata } from "@/lib/seo/page-metadata";

// Title/description from STATIC_PAGE_META (SEO phase 2, B6), self-canonical,
// default OG image.
export const metadata: Metadata = staticPageMetadata("/pc-builder");

export default async function PcBuilderPage() {
  const enabled = await isPcBuilderEnabled();
  if (!enabled) {
    return <PcBuilderUnavailable />;
  }
  return <PcBuilderShell />;
}

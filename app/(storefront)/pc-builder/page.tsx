import type { Metadata } from "next";
import { PcBuilderShell } from "@/features/pc-builder/pc-builder-shell";
import { PcBuilderUnavailable } from "@/features/pc-builder/pc-builder-unavailable";
import { isPcBuilderEnabled } from "@/lib/pc-builder/settings";
import { canonicalUrl } from "@/lib/seo/canonical";

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("/pc-builder") },
  title: "PC Builder — Techno House",
  description:
    "Build a custom PC slot by slot with compatibility notes and a running total.",
};

export default async function PcBuilderPage() {
  const enabled = await isPcBuilderEnabled();
  if (!enabled) {
    return <PcBuilderUnavailable />;
  }
  return <PcBuilderShell />;
}

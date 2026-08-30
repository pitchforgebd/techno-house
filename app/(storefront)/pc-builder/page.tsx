import type { Metadata } from "next";
import { PcBuilderShell } from "@/features/pc-builder/pc-builder-shell";

export const metadata: Metadata = {
  title: "PC Builder — Techno House",
  description:
    "Build a custom PC slot by slot with compatibility notes and a running total.",
};

export default function PcBuilderPage() {
  return <PcBuilderShell />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSlotCandidates } from "@/features/pc-builder/actions";
import { PcBuilderSelectView } from "@/features/pc-builder/pc-builder-select-view";
import {
  BUILDER_SLOTS,
  getBuilderSlotMeta,
  isBuilderSlotId,
} from "@/lib/domain/pc-builder";
import { getEffectiveBuilderSlots, isPcBuilderEnabled } from "@/lib/pc-builder/settings";

export function generateStaticParams() {
  return BUILDER_SLOTS.map((slot) => ({ slot: slot.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slot: string }>;
}): Promise<Metadata> {
  const { slot: slotParam } = await params;
  const slot = isBuilderSlotId(slotParam)
    ? getBuilderSlotMeta(slotParam)
    : undefined;
  if (!slot) {
    return { title: "PC Builder — Techno House" };
  }
  return {
    title: `Select ${slot.label} — PC Builder — Techno House`,
    description: `Choose a ${slot.label.toLowerCase()} for your custom PC build.`,
  };
}

export default async function PcBuilderSelectPage({
  params,
}: {
  params: Promise<{ slot: string }>;
}) {
  const { slot: slotParam } = await params;
  if (!isBuilderSlotId(slotParam)) {
    notFound();
  }
  const enabled = await isPcBuilderEnabled();
  if (!enabled) {
    notFound();
  }
  const effectiveSlots = await getEffectiveBuilderSlots();
  const slot = effectiveSlots.find((item) => item.id === slotParam);
  if (!slot) {
    notFound();
  }
  const products = await loadSlotCandidates(slot.id);
  return <PcBuilderSelectView slot={slot} products={products} />;
}

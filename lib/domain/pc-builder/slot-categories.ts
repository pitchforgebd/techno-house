import type { BuilderSlot } from "@/lib/data/types/catalog";

/**
 * Which catalogue categories feed which PC Builder slot (AD-348). One source
 * for the category tagger script and for the product form's automatic slot
 * default, so the two can never drift apart.
 */
export const BUILDER_SLOT_CATEGORY_SLUGS: readonly {
  slot: BuilderSlot;
  categorySlugs: readonly string[];
}[] = [
  { slot: "cpu", categorySlugs: ["processor"] },
  { slot: "cpu_cooler", categorySlugs: ["cpu-cooler"] },
  { slot: "motherboard", categorySlugs: ["motherboard"] },
  { slot: "ram", categorySlugs: ["ram-desktop"] },
  { slot: "gpu", categorySlugs: ["graphics-card"] },
  { slot: "ssd", categorySlugs: ["ssd", "nvme-ssd"] },
  { slot: "hdd", categorySlugs: ["hard-disk-drive"] },
  { slot: "psu", categorySlugs: ["power-supply"] },
  { slot: "case", categorySlugs: ["casing"] },
  { slot: "case_fans", categorySlugs: ["casing-cooler"] },
  { slot: "monitor", categorySlugs: ["monitor"] },
  { slot: "keyboard", categorySlugs: ["keyboard"] },
  { slot: "mouse", categorySlugs: ["mouse"] },
  { slot: "ups", categorySlugs: ["ups"] },
  { slot: "speaker", categorySlugs: ["speaker-and-home-theater"] },
  { slot: "headphone", categorySlugs: ["headphone"] },
  { slot: "network_adapter", categorySlugs: ["wifi-adapter", "lan-card"] },
  { slot: "antivirus", categorySlugs: ["antivirus"] },
];

export function defaultSlotForCategory(
  categorySlug: string | null | undefined,
): BuilderSlot | null {
  if (!categorySlug) {
    return null;
  }
  return (
    BUILDER_SLOT_CATEGORY_SLUGS.find((entry) =>
      entry.categorySlugs.includes(categorySlug),
    )?.slot ?? null
  );
}

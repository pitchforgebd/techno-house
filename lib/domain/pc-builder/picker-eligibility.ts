import type { BuilderCandidate, BuilderSlot } from "@/lib/data/types/catalog";

/**
 * What the PC Builder is allowed to offer a customer (AD-356).
 *
 * The builder assembles a DESKTOP, so two kinds of product never belong in a
 * picker however they are tagged:
 *   - laptop parts (SO-DIMM memory, "Laptop RAM", notebook keyboards, anything
 *     filed under a laptop category) — they do not fit a desktop board or case;
 *   - parts that are out of stock — a customer cannot order them.
 *
 * Pure and shared by the Prisma and mock repositories so the two can never
 * disagree. It only decides what is OFFERED: a part already in a saved build is
 * still loaded (by slug), so an old build keeps working and shows "Out of stock".
 */

/** Slots holding internal components, where "laptop" in the name means a laptop part. */
const INTERNAL_SLOTS: ReadonlySet<BuilderSlot> = new Set([
  "cpu",
  "cpu_cooler",
  "motherboard",
  "ram",
  "gpu",
  "ssd",
  "hdd",
  "psu",
  "case",
  "case_fans",
]);

const LAPTOP_CATEGORY = /laptop|notebook/i;
const LAPTOP_WORD = /\b(?:laptops?|notebooks?|macbooks?|ultrabooks?|chromebooks?)\b/i;
/** The small-outline memory module used in laptops; never fits a desktop DIMM slot. */
const SODIMM = /so[\s-]?dimm/i;
/** "… for Notebook", "… for a laptop" — the part is made for a laptop. */
const FOR_LAPTOP = /\bfor\s+(?:an?\s+)?(?:laptops?|notebooks?)\b/i;
/** Names like "SSD for Desktop & Laptop" fit a desktop too. */
const DESKTOP_WORD = /\b(?:pcs?|desktops?|computers?)\b/i;

export type LaptopCheckInput = {
  slot: BuilderSlot | null;
  name: string;
  categorySlug?: string | null;
  /** `builderAttrs.formFactor`; "SODIMM" on a memory part marks it as laptop RAM. */
  formFactor?: string | null;
};

/**
 * True for a part made for laptops. Conservative about marketing text: a name
 * that also says desktop / PC / computer ("SATA SSD for Desktop and Laptop",
 * "Keyboard for PC & Laptop") is treated as desktop-compatible and kept.
 */
export function isLaptopPart(input: LaptopCheckInput): boolean {
  if (input.categorySlug && LAPTOP_CATEGORY.test(input.categorySlug)) {
    return true;
  }
  if (SODIMM.test(input.name) || SODIMM.test(input.formFactor ?? "")) {
    return true;
  }
  if (DESKTOP_WORD.test(input.name)) {
    return false;
  }
  if (input.slot && INTERNAL_SLOTS.has(input.slot)) {
    return LAPTOP_WORD.test(input.name);
  }
  return FOR_LAPTOP.test(input.name);
}

/** Whether a picker should list this candidate: in stock and not a laptop part. */
export function isPickerEligible(candidate: BuilderCandidate): boolean {
  if (candidate.stockStatus === "out_of_stock") {
    return false;
  }
  return !isLaptopPart({
    slot: candidate.builderSlot,
    name: candidate.name,
    categorySlug: candidate.categorySlug,
    formFactor: candidate.builderAttrs?.formFactor,
  });
}

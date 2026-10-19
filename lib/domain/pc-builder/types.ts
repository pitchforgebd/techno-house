import type { BuilderSlot } from "@/lib/data/types/catalog";

/**
 * Product slugs selected for a slot, one entry per physical unit. A slot
 * with `multipleAllowed` can hold more than one (two RAM sticks, an SSD
 * plus an HDD); every other slot holds at most one. A key is always either
 * absent or a non-empty array — never present with an empty array.
 */
export type BuildSelection = Partial<Record<BuilderSlot, string[]>>;

export type CompatibilityStatus = "compatible" | "incompatible" | "unknown";

export type CompatibilityWarning = {
  status: CompatibilityStatus;
  code: string;
  message: string;
  slotIds?: BuilderSlot[];
  /**
   * Set only on an "unknown" warning from an exact-fit check (socket, RAM
   * type, form factor, storage interface): the slots whose part has no spec
   * data for that check. Lets the picker tell "this candidate lacks data"
   * apart from "the part you already picked lacks data". Deliberately unset
   * on the PSU-wattage estimate, which must never hide a part.
   */
  missingSlotIds?: BuilderSlot[];
};

export function emptyBuildSelection(): BuildSelection {
  return {};
}

export function isSlotFilled(
  selection: BuildSelection,
  slotId: BuilderSlot,
): boolean {
  return (selection[slotId]?.length ?? 0) > 0;
}

import type { BuilderSlot } from "@/lib/data/types/catalog";

/** Product slug selected for a slot. Null means empty. */
export type BuildSelection = Partial<Record<BuilderSlot, string | null>>;

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
  const slug = selection[slotId];
  return typeof slug === "string" && slug.length > 0;
}

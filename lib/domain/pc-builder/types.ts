import type { BuilderSlot } from "@/lib/data/types/catalog";

/** Product slug selected for a slot. Null means empty. */
export type BuildSelection = Partial<Record<BuilderSlot, string | null>>;

export type CompatibilityStatus = "compatible" | "incompatible" | "unknown";

export type CompatibilityWarning = {
  status: CompatibilityStatus;
  code: string;
  message: string;
  slotIds?: BuilderSlot[];
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

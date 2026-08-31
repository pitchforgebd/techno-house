import type { BuilderSlot } from "@/lib/data/types/catalog";
import {
  BUILDER_SLOTS,
  type BuilderSlotMeta,
} from "@/lib/domain/pc-builder/slots";
import {
  emptyBuildSelection,
  isSlotFilled,
  type BuildSelection,
} from "@/lib/domain/pc-builder/types";

export const BUILDER_STORAGE_KEY = "techno-house-pc-builder-v1";

const SLOT_ID_SET = new Set<BuilderSlot>(BUILDER_SLOTS.map((slot) => slot.id));

export function isBuilderSlotId(value: string): value is BuilderSlot {
  return SLOT_ID_SET.has(value as BuilderSlot);
}

export function builderSelectPath(slotId: BuilderSlot): string {
  return `/pc-builder/select/${slotId}`;
}

export function normalizeBuildSelection(raw: unknown): BuildSelection {
  if (!raw || typeof raw !== "object") {
    return emptyBuildSelection();
  }
  const source = raw as Record<string, unknown>;
  const next: BuildSelection = {};
  for (const slot of BUILDER_SLOTS) {
    const value = source[slot.id];
    if (typeof value === "string") {
      const slug = value.trim();
      if (slug) {
        next[slot.id] = slug;
      }
    }
  }
  return next;
}

export function selectedSlugs(selection: BuildSelection): string[] {
  const slugs: string[] = [];
  for (const slot of BUILDER_SLOTS) {
    const slug = selection[slot.id];
    if (typeof slug === "string" && slug.length > 0) {
      slugs.push(slug);
    }
  }
  return [...new Set(slugs)];
}

export function countFilledSlots(selection: BuildSelection): {
  filled: number;
  requiredFilled: number;
  requiredTotal: number;
  total: number;
} {
  let filled = 0;
  let requiredFilled = 0;
  let requiredTotal = 0;
  for (const slot of BUILDER_SLOTS) {
    if (slot.required) {
      requiredTotal += 1;
    }
    if (isSlotFilled(selection, slot.id)) {
      filled += 1;
      if (slot.required) {
        requiredFilled += 1;
      }
    }
  }
  return {
    filled,
    requiredFilled,
    requiredTotal,
    total: BUILDER_SLOTS.length,
  };
}

export function setSlotSelection(
  selection: BuildSelection,
  slotId: BuilderSlot,
  slug: string,
): BuildSelection {
  const trimmed = slug.trim();
  if (!trimmed || !isBuilderSlotId(slotId)) {
    return selection;
  }
  return { ...selection, [slotId]: trimmed };
}

export function clearSlotSelection(
  selection: BuildSelection,
  slotId: BuilderSlot,
): BuildSelection {
  if (!isBuilderSlotId(slotId)) {
    return selection;
  }
  const next = { ...selection };
  delete next[slotId];
  return next;
}

export function slotMetaList(): readonly BuilderSlotMeta[] {
  return BUILDER_SLOTS;
}

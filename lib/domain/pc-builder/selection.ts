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

export function builderSelectPath(
  slotId: BuilderSlot,
  mode?: "add",
): string {
  const base = `/pc-builder/select/${slotId}`;
  return mode ? `${base}?mode=${mode}` : base;
}

/**
 * Accepts either shape for one slot's raw value — a single legacy string
 * (old persisted selections, pre-multi-item) or an array (current shape) —
 * and always returns the canonical trimmed, non-empty array form.
 */
function normalizeSlotValue(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
}

export function normalizeBuildSelection(raw: unknown): BuildSelection {
  if (!raw || typeof raw !== "object") {
    return emptyBuildSelection();
  }
  const source = raw as Record<string, unknown>;
  const next: BuildSelection = {};
  for (const slot of BUILDER_SLOTS) {
    const slugs = normalizeSlotValue(source[slot.id]);
    if (slugs.length > 0) {
      next[slot.id] = slugs;
    }
  }
  return next;
}

export function selectedSlugs(selection: BuildSelection): string[] {
  const slugs: string[] = [];
  for (const slot of BUILDER_SLOTS) {
    for (const slug of selection[slot.id] ?? []) {
      slugs.push(slug);
    }
  }
  return [...new Set(slugs)];
}

export function countFilledSlots(
  selection: BuildSelection,
  slots: readonly BuilderSlotMeta[] = BUILDER_SLOTS,
): {
  filled: number;
  requiredFilled: number;
  requiredTotal: number;
  total: number;
} {
  let filled = 0;
  let requiredFilled = 0;
  let requiredTotal = 0;
  for (const slot of slots) {
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
    total: slots.length,
  };
}

/** Replaces the whole slot with exactly this one item (the default pick/"Replace" flow). */
export function setSlotSelection(
  selection: BuildSelection,
  slotId: BuilderSlot,
  slug: string,
): BuildSelection {
  const trimmed = slug.trim();
  if (!trimmed || !isBuilderSlotId(slotId)) {
    return selection;
  }
  return { ...selection, [slotId]: [trimmed] };
}

/** Appends one more item to the slot ("+ Add Another …") without touching what's already there. */
export function addSlotSelection(
  selection: BuildSelection,
  slotId: BuilderSlot,
  slug: string,
): BuildSelection {
  const trimmed = slug.trim();
  if (!trimmed || !isBuilderSlotId(slotId)) {
    return selection;
  }
  const existing = selection[slotId] ?? [];
  return { ...selection, [slotId]: [...existing, trimmed] };
}

/** Removes just the item at `index` within the slot, leaving any others in place. */
export function removeSlotItem(
  selection: BuildSelection,
  slotId: BuilderSlot,
  index: number,
): BuildSelection {
  if (!isBuilderSlotId(slotId)) {
    return selection;
  }
  const existing = selection[slotId] ?? [];
  const next = existing.filter((_, i) => i !== index);
  const copy = { ...selection };
  if (next.length > 0) {
    copy[slotId] = next;
  } else {
    delete copy[slotId];
  }
  return copy;
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

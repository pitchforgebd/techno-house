import type { BuilderAttrs, BuilderSlot } from "@/lib/data/types/catalog";
import { parseAttrList } from "@/lib/domain/pc-builder/attr-values";
import {
  SLOT_REQUIRED_FIELDS,
  type BuilderAttrField,
} from "@/lib/domain/pc-builder/attribute-options";

/**
 * Which compatibility fields a part still lacks (AD-348) — pure, so the admin
 * "Compatibility data" page, its server loader and the tests all agree on what
 * "ready" means.
 */
export function missingRequiredFields(
  slot: BuilderSlot,
  attrs: BuilderAttrs | null | undefined,
): BuilderAttrField[] {
  const required = SLOT_REQUIRED_FIELDS[slot] ?? [];
  return required.filter((field) => {
    if (field === "tdpWatts") {
      return !(typeof attrs?.tdpWatts === "number" && attrs.tdpWatts > 0);
    }
    return parseAttrList(attrs?.[field]).length === 0;
  });
}

export function isCompatibilityReady(
  slot: BuilderSlot,
  attrs: BuilderAttrs | null | undefined,
): boolean {
  return missingRequiredFields(slot, attrs).length === 0;
}

/** One slot's coverage line on the admin page. */
export type CompatibilityCoverageRow = {
  slot: BuilderSlot;
  label: string;
  /** Active products carrying this slot. */
  total: number;
  ready: number;
};

/** One product row on the admin page; values are the stored strings. */
export type CompatibilityProductRow = {
  id: string;
  sku: string;
  name: string;
  brandName: string;
  isActive: boolean;
  values: Record<BuilderAttrField, string>;
  missing: BuilderAttrField[];
};

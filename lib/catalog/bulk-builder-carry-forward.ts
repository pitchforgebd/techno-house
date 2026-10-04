import type { ProductInputFields } from "@/lib/catalog/product-input";
import { toBuilderSlot } from "@/lib/data/prisma/mappers";
import { defaultSlotForCategory } from "@/lib/domain/pc-builder/slot-categories";

/**
 * The bulk CSV has no PC Builder columns, but saving a product overwrites its
 * builder slot and compatibility values with whatever the input carries — and
 * an empty input means "not a builder part", i.e. null. So re-importing an
 * existing SKU (including the admin Export → edit → Import round trip) would
 * silently wipe the slot and every compatibility value on that product.
 *
 * For an existing product the importer therefore feeds the product's current
 * values back in unchanged. Pure, so the carry-forward is unit-checked
 * without a database.
 */
export type ExistingBuilderRow = {
  builderSlot: Parameters<typeof toBuilderSlot>[0] | null;
  builderSocket: string | null;
  builderRamType: string | null;
  builderFormFactor: string | null;
  builderTdpWatts: number | null;
  builderStorageInterface: string | null;
};

export const EXISTING_BUILDER_SELECT = {
  builderSlot: true,
  builderSocket: true,
  builderRamType: true,
  builderFormFactor: true,
  builderTdpWatts: true,
  builderStorageInterface: true,
} as const;

export function carryForwardBuilderFields(
  row: ExistingBuilderRow,
): Pick<
  ProductInputFields,
  | "builderSlot"
  | "builderSocket"
  | "builderRamType"
  | "builderFormFactor"
  | "builderTdpWatts"
  | "builderStorageInterface"
> {
  return {
    builderSlot: row.builderSlot ? toBuilderSlot(row.builderSlot) : "",
    builderSocket: row.builderSocket ?? "",
    builderRamType: row.builderRamType ?? "",
    builderFormFactor: row.builderFormFactor ?? "",
    builderTdpWatts:
      row.builderTdpWatts != null ? String(row.builderTdpWatts) : "",
    builderStorageInterface: row.builderStorageInterface ?? "",
  };
}

/**
 * A brand-new bulk-imported product has no CSV column for the PC Builder, so
 * it would otherwise land with no slot — invisible to the storefront builder
 * AND to the admin Compatibility data page, which only lists slotted parts.
 * Give it its category's slot (compatibility values start empty; staff fill
 * them in, or use "Auto-fill from product names"). Only for NEW rows: a CSV
 * cannot express "deliberately not a builder part", so there is no explicit
 * choice to override, and existing products keep what they have.
 */
export function defaultBuilderFieldsForNewProduct(
  categorySlug: string,
): ReturnType<typeof carryForwardBuilderFields> {
  return {
    builderSlot: defaultSlotForCategory(categorySlug) ?? "",
    builderSocket: "",
    builderRamType: "",
    builderFormFactor: "",
    builderTdpWatts: "",
    builderStorageInterface: "",
  };
}

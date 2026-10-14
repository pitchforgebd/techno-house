/**
 * Admin product list -> Quick edit (AD-372).
 *
 * Price and stock are the two things an operator changes most often and used
 * to need the full product form for — this is the validated field set behind
 * the small drawer that lets them do it from the list instead. Deliberately
 * narrow: just the fields the operator asked for (price, regular price,
 * stock, low-stock threshold), reusing the exact rules the full form and the
 * stock drawer already enforce (`parseTaka`, `parseInventoryInput`), not a
 * second copy of them.
 */
import {
  parseInventoryInput,
  type InventoryInputFields,
} from "@/lib/catalog/inventory-input";
import { parseTaka } from "@/lib/catalog/product-input";

export type QuickEditInputFields = {
  price: string;
  /** Blank or "0" clears it — same convention as the full product form. */
  compareAt: string;
} & InventoryInputFields;

export type ParsedQuickEdit = {
  priceAmount: number;
  compareAtAmount: number | null;
  quantity: number;
  lowStockThreshold: number;
  /** True only when this edit itself puts the product on sale (compareAt > price). */
  marksAsSale: boolean;
};

export function parseQuickEditInput(
  input: QuickEditInputFields,
): { ok: true; value: ParsedQuickEdit } | { ok: false; formError: string } {
  const priceAmount = parseTaka(input.price, "price");
  if (typeof priceAmount === "string") {
    return { ok: false, formError: priceAmount };
  }
  if (priceAmount <= 0) {
    return { ok: false, formError: "Enter a price greater than 0." };
  }

  const compareRaw = input.compareAt.trim();
  let compareAtAmount: number | null = null;
  if (compareRaw && compareRaw !== "0" && compareRaw !== "0.00") {
    const compareParsed = parseTaka(input.compareAt, "regular price");
    if (typeof compareParsed === "string") {
      return { ok: false, formError: compareParsed };
    }
    if (compareParsed <= priceAmount) {
      return {
        ok: false,
        formError: "Regular price must be higher than the price.",
      };
    }
    compareAtAmount = compareParsed;
  }

  const inventory = parseInventoryInput({
    quantity: input.quantity,
    lowStockThreshold: input.lowStockThreshold,
  });
  if (!inventory.ok) {
    return inventory;
  }

  return {
    ok: true,
    value: {
      priceAmount,
      compareAtAmount,
      quantity: inventory.value.quantity,
      lowStockThreshold: inventory.value.lowStockThreshold,
      marksAsSale: compareAtAmount !== null,
    },
  };
}

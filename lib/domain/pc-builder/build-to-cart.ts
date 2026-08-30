import type { StockStatus } from "@/lib/data/types/common";
import type { CompatibilityResult } from "@/lib/domain/pc-builder/compatibility";
import { countFilledSlots } from "@/lib/domain/pc-builder/selection";
import { BUILDER_SLOTS } from "@/lib/domain/pc-builder/slots";
import type { BuildSelection } from "@/lib/domain/pc-builder/types";

export type BuildToCartProduct = {
  slug: string;
  stockStatus: StockStatus;
};

export type BuildToCartPlan =
  | {
      ok: true;
      slugs: string[];
      hasUnknownCompatibility: boolean;
    }
  | {
      ok: false;
      code:
        | "empty"
        | "incomplete"
        | "missing_product"
        | "out_of_stock"
        | "incompatible"
        | "cart_full";
      reason: string;
    };

/**
 * Pure plan for adding a build to the cart (display/local cart only).
 * Server revalidation lands in Phase 14.
 */
export function planBuildToCart({
  selection,
  products,
  compatibility,
  existingCartSlugs,
  maxCartLines,
}: {
  selection: BuildSelection;
  products: BuildToCartProduct[];
  compatibility: CompatibilityResult | null;
  existingCartSlugs: string[];
  maxCartLines: number;
}): BuildToCartPlan {
  const counts = countFilledSlots(selection);
  if (counts.filled === 0) {
    return {
      ok: false,
      code: "empty",
      reason: "Select parts before adding the build to cart.",
    };
  }
  if (counts.requiredFilled < counts.requiredTotal) {
    return {
      ok: false,
      code: "incomplete",
      reason: `Fill all required slots (${counts.requiredFilled}/${counts.requiredTotal}) before adding to cart.`,
    };
  }

  if (compatibility?.hasIncompatible) {
    return {
      ok: false,
      code: "incompatible",
      reason: "Resolve incompatible parts before adding this build to cart.",
    };
  }

  const productBySlug = new Map(
    products.map((product) => [product.slug, product]),
  );
  const slugs: string[] = [];

  for (const slot of BUILDER_SLOTS) {
    const slug = selection[slot.id];
    if (typeof slug !== "string" || !slug) {
      continue;
    }
    if (slugs.includes(slug)) {
      continue;
    }
    const product = productBySlug.get(slug);
    if (!product) {
      return {
        ok: false,
        code: "missing_product",
        reason: `Could not resolve product for ${slot.label}. Try again in a moment.`,
      };
    }
    if (product.stockStatus === "out_of_stock") {
      return {
        ok: false,
        code: "out_of_stock",
        reason: `${slot.label} is out of stock and cannot be added.`,
      };
    }
    slugs.push(slug);
  }

  if (slugs.length === 0) {
    return {
      ok: false,
      code: "empty",
      reason: "Select parts before adding the build to cart.",
    };
  }

  const existing = new Set(existingCartSlugs);
  const newLines = slugs.filter((slug) => !existing.has(slug)).length;
  if (existing.size + newLines > maxCartLines) {
    return {
      ok: false,
      code: "cart_full",
      reason: `Cart can hold at most ${maxCartLines} lines. Remove items or shorten the build.`,
    };
  }

  return {
    ok: true,
    slugs,
    hasUnknownCompatibility: compatibility?.hasUnknown ?? false,
  };
}

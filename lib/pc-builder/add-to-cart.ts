/**
 * Server build-to-cart (P14-T07).
 *
 * Revalidates the live build, then writes through the existing cart persist
 * path. The client may send slugs only — never prices or attributes.
 */
import { MAX_CART_LINES, type CartState } from "@/lib/cart/cart";
import {
  addBuildItemsToCart,
  getPersistedCart,
  usesCartDatabase,
} from "@/lib/cart/persist";
import {
  planValidatedBuildToCart,
  type BuildSelection,
} from "@/lib/domain/pc-builder";
import type { BuilderSlot } from "@/lib/data/types/catalog";
import { validateBuild } from "@/lib/pc-builder/validate-build";
import { isPcBuilderEnabled } from "@/lib/pc-builder/settings";

export type AddBuildToCartResult =
  | {
      ok: true;
      slugs: string[];
      hasUnknownCompatibility: boolean;
      persisted: boolean;
      state?: CartState;
    }
  | { ok: false; reason: string; persisted: boolean };

function fail(reason: string, persisted: boolean): AddBuildToCartResult {
  return { ok: false, reason, persisted };
}

export async function addBuildToCart(
  raw: BuildSelection,
): Promise<AddBuildToCartResult> {
  const persisted = usesCartDatabase();
  if (!(await isPcBuilderEnabled())) {
    return fail("The PC Builder is temporarily unavailable.", persisted);
  }
  const snapshot = await validateBuild(raw);
  const existing = persisted
    ? (await getPersistedCart()).lines.map((line) => line.slug)
    : [];

  const plan = planValidatedBuildToCart({
    selection: snapshot.selection,
    products: snapshot.products.map((product) => ({
      slug: product.slug,
      stockStatus: product.stockStatus,
    })),
    compatibility: snapshot.compatibility,
    issues: snapshot.issues,
    existingCartSlugs: existing,
    maxCartLines: MAX_CART_LINES,
    slots: snapshot.slots,
  });

  if (!plan.ok) {
    return fail(plan.reason, persisted);
  }

  if (!persisted) {
    return {
      ok: true,
      slugs: plan.slugs,
      hasUnknownCompatibility: plan.hasUnknownCompatibility,
      persisted: false,
    };
  }

  const slugSet = new Set(plan.slugs);
  const items = (
    Object.entries(snapshot.selection) as [BuilderSlot, string | undefined][]
  )
    .filter(
      (entry): entry is [BuilderSlot, string] =>
        typeof entry[1] === "string" && slugSet.has(entry[1]),
    )
    .map(([slot, slug]) => ({ slug, builderSlot: slot }));

  const written = await addBuildItemsToCart(items);
  if (!written.ok) {
    return fail(written.reason, true);
  }

  return {
    ok: true,
    slugs: plan.slugs,
    hasUnknownCompatibility: plan.hasUnknownCompatibility,
    persisted: true,
    state: written.state,
  };
}

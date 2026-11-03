/**
 * Product variants (AD-388) — shared, client-safe helpers.
 *
 * A product can declare up to `VARIANT_OPTION_MAX` options ("Color",
 * "Storage", "RAM / ROM", "Size", …) and each `ProductVariant` is one
 * combination of their values, with its own SKU, price, stock and image.
 * `Product.variantOptionNames` holds the option names in order and
 * `ProductVariant.optionValues` the matching values.
 *
 * Variants saved before options existed have no option values, only a
 * name; they are read as one implicit option (`LEGACY_VARIANT_OPTION`)
 * whose values are those names, so they keep working unchanged.
 */

export const VARIANT_OPTION_MAX = 3;
export const VARIANT_OPTION_NAME_MAX = 30;
export const VARIANT_OPTION_VALUE_MAX = 40;
export const VARIANT_VALUES_PER_OPTION_MAX = 20;
/** Price/stock shortcuts refuse products whose variants own those values. */
export const VARIANT_MANAGED_ERROR =
  "This product has variants — edit each variant's price and stock in the product form.";
/** Option name used for legacy name-only variants. */
export const LEGACY_VARIANT_OPTION = "Variant";
/** Suggestions offered when naming an option in admin. */
export const VARIANT_OPTION_SUGGESTIONS = [
  "Color",
  "Storage",
  "RAM",
  "RAM / ROM",
  "Size",
  "Screen size",
  "Capacity",
  "Model",
] as const;

export type VariantOptionGroup = {
  name: string;
  values: string[];
};

/** Display label for a combination: "Black / 256GB". */
export function variantDisplayName(values: readonly string[]): string {
  return values.map((value) => value.trim()).join(" / ");
}

/** Case- and space-insensitive identity of a value. */
export function normalizeVariantValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Identity of a whole combination, for duplicate checks and matching. */
export function variantComboKey(values: readonly string[]): string {
  return values.map(normalizeVariantValue).join("\u0001");
}

/**
 * Every combination of the options' values, in option order (the first
 * option varies slowest). Options without values are skipped, so a
 * half-filled option row does not wipe the table.
 */
export function variantCombinations(
  options: readonly VariantOptionGroup[],
): string[][] {
  const filled = options.filter((option) => option.values.length > 0);
  if (filled.length === 0) {
    return [];
  }
  let combos: string[][] = [[]];
  for (const option of filled) {
    const next: string[][] = [];
    for (const combo of combos) {
      for (const value of option.values) {
        next.push([...combo, value]);
      }
    }
    combos = next;
  }
  return combos;
}

/**
 * The option groups a product's variants should be chosen by. With real
 * option names, each group lists the values its variants actually use (in
 * first-seen order); legacy name-only variants become one implicit group.
 */
export function resolveVariantOptionGroups(
  optionNames: readonly string[],
  variants: readonly { name: string; optionValues: readonly string[] }[],
): VariantOptionGroup[] {
  if (variants.length === 0) {
    return [];
  }
  const usesOptions =
    optionNames.length > 0 &&
    variants.every((variant) => variant.optionValues.length === optionNames.length);
  if (!usesOptions) {
    return [
      {
        name: LEGACY_VARIANT_OPTION,
        values: uniqueValues(variants.map((variant) => variant.name)),
      },
    ];
  }
  return optionNames.map((name, index) => ({
    name,
    values: uniqueValues(
      variants.map((variant) => variant.optionValues[index] ?? ""),
    ),
  }));
}

/** A variant's values against `resolveVariantOptionGroups`' groups. */
export function variantValuesFor(
  optionNames: readonly string[],
  variant: { name: string; optionValues: readonly string[] },
): string[] {
  return optionNames.length > 0 &&
    variant.optionValues.length === optionNames.length
    ? [...variant.optionValues]
    : [variant.name];
}

function uniqueValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalizeVariantValue(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

// ---------------------------------------------------------- storefront ----

/** The minimum the product page's selector needs from a variant. */
export type SelectableVariant = {
  id: string;
  values: string[];
  priceAmount: number;
  available: boolean;
};

/** The variant whose values match `selected` exactly, if any. */
export function findVariantBySelection<T extends SelectableVariant>(
  variants: readonly T[],
  selected: readonly (string | null)[],
): T | null {
  if (selected.some((value) => value === null)) {
    return null;
  }
  const key = variantComboKey(selected as string[]);
  return variants.find((variant) => variantComboKey(variant.values) === key) ?? null;
}

/**
 * Whether picking `value` for option `optionIndex` (keeping the other
 * current picks) leads to some variant, and whether that one is in stock.
 */
export function variantValueState(
  variants: readonly SelectableVariant[],
  selected: readonly (string | null)[],
  optionIndex: number,
  value: string,
): "available" | "out_of_stock" | "unavailable" {
  const wanted = normalizeVariantValue(value);
  const matches = variants.filter((variant) =>
    variant.values.every((candidate, index) => {
      if (index === optionIndex) {
        return normalizeVariantValue(candidate) === wanted;
      }
      const pick = selected[index];
      return pick == null || normalizeVariantValue(candidate) === normalizeVariantValue(pick);
    }),
  );
  if (matches.length === 0) {
    return "unavailable";
  }
  return matches.some((variant) => variant.available) ? "available" : "out_of_stock";
}

/**
 * The selection to start from: the cheapest in-stock variant (that is the
 * price the product card shows — see `lowestVariantPrice`), else the first.
 */
export function defaultVariant<T extends SelectableVariant>(
  variants: readonly T[],
): T | null {
  let best: T | null = null;
  for (const variant of variants) {
    if (!variant.available) {
      continue;
    }
    if (!best || variant.priceAmount < best.priceAmount) {
      best = variant;
    }
  }
  return best ?? variants[0] ?? null;
}

/**
 * After picking `value` for one option, the selection to move to: keep the
 * other picks when that combination exists, otherwise jump to the closest
 * existing variant carrying the new value (preferring one in stock), so a
 * click never lands on a dead combination.
 */
export function selectVariantValue<T extends SelectableVariant>(
  variants: readonly T[],
  selected: readonly (string | null)[],
  optionIndex: number,
  value: string,
): (string | null)[] {
  const next = [...selected];
  next[optionIndex] = value;
  if (findVariantBySelection(variants, next)) {
    return next;
  }
  const wanted = normalizeVariantValue(value);
  const carrying = variants.filter(
    (variant) => normalizeVariantValue(variant.values[optionIndex] ?? "") === wanted,
  );
  const score = (variant: T) =>
    variant.values.reduce(
      (sum, candidate, index) =>
        sum +
        (index !== optionIndex &&
        selected[index] != null &&
        normalizeVariantValue(candidate) === normalizeVariantValue(selected[index] as string)
          ? 1
          : 0),
      0,
    ) + (variant.available ? 0.5 : 0);
  const best = [...carrying].sort((a, b) => score(b) - score(a))[0];
  return best ? [...best.values] : next;
}

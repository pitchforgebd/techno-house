"use client";

import { useState, type KeyboardEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AdminMediaPickerModal } from "@/features/admin/media/admin-media-picker";
import {
  AdminFormDashedButton,
  AdminFormLabel,
  AdminFormPresetNote,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import {
  LEGACY_VARIANT_OPTION,
  VARIANT_OPTION_MAX,
  VARIANT_OPTION_NAME_MAX,
  VARIANT_OPTION_SUGGESTIONS,
  VARIANT_OPTION_VALUE_MAX,
  VARIANT_VALUES_PER_OPTION_MAX,
  normalizeVariantValue,
  variantCombinations,
  variantComboKey,
  variantDisplayName,
  type VariantOptionGroup,
} from "@/lib/catalog/variants";
import {
  PRODUCT_SKU_MAX,
  PRODUCT_VARIANT_MAX,
  type ProductVariantInputFields,
} from "@/lib/catalog/product-input";
import { cn } from "@/lib/cn";

/**
 * Admin product form -> Variants (AD-388).
 *
 * Staff name up to three options (Color, Storage, RAM / ROM, Size — any
 * label) and list each one's values; the table below then holds exactly one
 * row per combination, kept in step as options change. Each row is a real
 * purchasable variant with its own SKU, price, regular price, stock, image
 * and on/off switch — that is what the product page selector, the cart and
 * checkout charge from.
 */

export type VariantFormRow = {
  /** Existing variant id — keeps cart lines/orders linked across edits. */
  id?: string;
  optionValues: string[];
  sku: string;
  price: string;
  compareAt: string;
  quantity: string;
  isActive: boolean;
  imageSrc: string;
  /** Units held by open orders; stock can't go below this. */
  reserved: number;
};

export type VariantFormState = {
  options: VariantOptionGroup[];
  rows: VariantFormRow[];
};

type EditorVariant = {
  id: string;
  name: string;
  optionValues?: string[];
  sku: string;
  priceAmount: number;
  compareAtAmount: number | null;
  isActive: boolean;
  quantity: number;
  reserved?: number;
  imageSrc?: string | null;
};

/** Form state from a saved product. Legacy name-only variants become one
 * "Variant" option whose values are their names, so they stay editable. */
export function variantFormFromProduct(
  optionNames: readonly string[] | undefined,
  variants: readonly EditorVariant[] | undefined,
): VariantFormState {
  const list = variants ?? [];
  if (list.length === 0) {
    return { options: [], rows: [] };
  }
  const names = optionNames ?? [];
  const usesOptions =
    names.length > 0 &&
    list.every((variant) => (variant.optionValues ?? []).length === names.length);
  const valuesOf = (variant: EditorVariant) =>
    usesOptions ? [...(variant.optionValues ?? [])] : [variant.name];
  const optionList = usesOptions ? names : [LEGACY_VARIANT_OPTION];
  const options = optionList.map((name, index) => {
    const seen = new Set<string>();
    const values: string[] = [];
    for (const variant of list) {
      const value = valuesOf(variant)[index] ?? "";
      const key = normalizeVariantValue(value);
      if (key && !seen.has(key)) {
        seen.add(key);
        values.push(value);
      }
    }
    return { name, values };
  });
  return {
    options,
    rows: list.map((variant) => ({
      id: variant.id,
      optionValues: valuesOf(variant),
      sku: variant.sku,
      price: String(variant.priceAmount),
      compareAt:
        variant.compareAtAmount != null ? String(variant.compareAtAmount) : "",
      quantity: String(variant.quantity),
      isActive: variant.isActive,
      imageSrc: variant.imageSrc ?? "",
      reserved: variant.reserved ?? 0,
    })),
  };
}

/** The options that actually produce variants (named or not, with values). */
function filledOptions(options: readonly VariantOptionGroup[]) {
  return options.filter((option) => option.values.length > 0);
}

/** What the form submits: option names + one input row per variant. */
export function variantFormToInput(state: VariantFormState): {
  variantOptionNames: string[];
  variants: ProductVariantInputFields[];
} {
  return {
    variantOptionNames: filledOptions(state.options).map((option) =>
      option.name.trim(),
    ),
    variants: state.rows.map((row) => ({
      id: row.id,
      name: variantDisplayName(row.optionValues),
      optionValues: row.optionValues,
      sku: row.sku,
      price: row.price,
      compareAt: row.compareAt,
      quantity: row.quantity,
      isActive: row.isActive,
      imageSrc: row.imageSrc,
    })),
  };
}

/** Totals the form shows/sends for the product itself while it has variants. */
export function variantFormSummary(state: VariantFormState): {
  active: number;
  lowestPrice: { price: string; compareAt: string } | null;
  totalStock: number;
} {
  let lowest: VariantFormRow | null = null;
  let totalStock = 0;
  let active = 0;
  for (const row of state.rows) {
    if (!row.isActive) {
      continue;
    }
    active += 1;
    totalStock += Number.parseInt(row.quantity, 10) || 0;
    const price = Number.parseFloat(row.price);
    if (
      Number.isFinite(price) &&
      price > 0 &&
      (!lowest || price < Number.parseFloat(lowest.price))
    ) {
      lowest = row;
    }
  }
  return {
    active,
    totalStock,
    lowestPrice: lowest
      ? { price: lowest.price, compareAt: lowest.compareAt }
      : null,
  };
}

function skuPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 8);
}

function autoSku(productSku: string, values: readonly string[]): string {
  const base = productSku.trim();
  if (!base) {
    return "";
  }
  return [base, ...values.map(skuPart).filter(Boolean)]
    .join("-")
    .slice(0, PRODUCT_SKU_MAX);
}

/**
 * One row per combination of the options. Rows whose combination still
 * exists are kept as they are; a new combination inherits the data (and,
 * for the first one, the identity) of the old row it extends — so adding a
 * second option to an existing list doesn't throw away prices and stock.
 */
function syncRows(
  options: readonly VariantOptionGroup[],
  rows: readonly VariantFormRow[],
  productSku: string,
  defaultPrice: string,
): VariantFormRow[] {
  const combos = variantCombinations(options);
  const byKey = new Map(rows.map((row) => [variantComboKey(row.optionValues), row]));
  const used = new Set<VariantFormRow>();
  const next: VariantFormRow[] = [];
  for (const combo of combos) {
    const exact = byKey.get(variantComboKey(combo));
    if (exact && !used.has(exact)) {
      used.add(exact);
      next.push({ ...exact, optionValues: combo });
      continue;
    }
    const comboValues = new Set(combo.map(normalizeVariantValue));
    const parent = rows.find(
      (row) =>
        row.optionValues.length > 0 &&
        row.optionValues.every((value) =>
          comboValues.has(normalizeVariantValue(value)),
        ),
    );
    if (parent && !used.has(parent)) {
      used.add(parent);
      next.push({ ...parent, optionValues: combo });
      continue;
    }
    next.push({
      optionValues: combo,
      sku: autoSku(productSku, combo),
      price: parent?.price ?? defaultPrice,
      compareAt: parent?.compareAt ?? "",
      quantity: parent ? "0" : "",
      isActive: true,
      imageSrc: parent?.imageSrc ?? "",
      reserved: 0,
    });
  }
  return next;
}

export function AdminProductVariantsFields({
  value,
  onChange,
  productSku,
  defaultPrice,
  disabled,
}: {
  value: VariantFormState;
  onChange: (next: VariantFormState) => void;
  productSku: string;
  /** Price a brand-new combination starts with (the product's price). */
  defaultPrice: string;
  disabled?: boolean;
}) {
  const [drafts, setDrafts] = useState<string[]>(() =>
    value.options.map(() => ""),
  );
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const [bulk, setBulk] = useState({ price: "", compareAt: "", quantity: "" });

  const combos = variantCombinations(value.options).length;
  const tooMany = combos > PRODUCT_VARIANT_MAX;

  function setOptions(options: VariantOptionGroup[]) {
    const tooBig = variantCombinations(options).length > PRODUCT_VARIANT_MAX;
    onChange({
      options,
      // Past the cap the table is left as it was; the warning explains.
      rows: tooBig
        ? value.rows
        : syncRows(options, value.rows, productSku, defaultPrice),
    });
  }

  function updateOption(index: number, patch: Partial<VariantOptionGroup>) {
    setOptions(
      value.options.map((option, i) =>
        i === index ? { ...option, ...patch } : option,
      ),
    );
  }

  function addValues(index: number, raw: string) {
    const option = value.options[index];
    if (!option) {
      return;
    }
    const seen = new Set(option.values.map(normalizeVariantValue));
    const added: string[] = [];
    for (const part of raw.split(",")) {
      const text = part.trim().replace(/\s+/g, " ").slice(0, VARIANT_OPTION_VALUE_MAX);
      const key = normalizeVariantValue(text);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      added.push(text);
    }
    // Cleared even when nothing was new — a duplicate is already a chip.
    setDrafts((current) => current.map((d, i) => (i === index ? "" : d)));
    if (added.length === 0) {
      return;
    }
    updateOption(index, {
      values: [...option.values, ...added].slice(0, VARIANT_VALUES_PER_OPTION_MAX),
    });
  }

  function onValueKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      // Enter must add the value, never submit the product form.
      event.preventDefault();
      addValues(index, drafts[index] ?? "");
    } else if (
      event.key === "Backspace" &&
      !(drafts[index] ?? "") &&
      (value.options[index]?.values.length ?? 0) > 0
    ) {
      const option = value.options[index];
      updateOption(index, { values: option ? option.values.slice(0, -1) : [] });
    }
  }

  function addOption(name = "") {
    if (value.options.length >= VARIANT_OPTION_MAX) {
      return;
    }
    setDrafts((current) => [...current, ""]);
    onChange({ ...value, options: [...value.options, { name, values: [] }] });
  }

  function removeOption(index: number) {
    setDrafts((current) => current.filter((_, i) => i !== index));
    setOptions(value.options.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<VariantFormRow>) {
    onChange({
      ...value,
      rows: value.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  }

  function applyBulk() {
    onChange({
      ...value,
      rows: value.rows.map((row) => ({
        ...row,
        ...(bulk.price.trim() ? { price: bulk.price.trim() } : {}),
        ...(bulk.compareAt.trim() ? { compareAt: bulk.compareAt.trim() } : {}),
        ...(bulk.quantity.trim()
          ? {
              quantity: String(
                Math.max(row.reserved, Number.parseInt(bulk.quantity, 10) || 0),
              ),
            }
          : {}),
      })),
    });
  }

  function fillSkus() {
    onChange({
      ...value,
      rows: value.rows.map((row) =>
        row.sku.trim() ? row : { ...row, sku: autoSku(productSku, row.optionValues) },
      ),
    });
  }

  const optionNames = filledOptions(value.options).map((option) => option.name);
  const summary = variantFormSummary(value);
  const pickedRow = pickerRow != null ? value.rows[pickerRow] : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        Use variants when one product is sold in several versions with their own
        price or stock — e.g. Color (Black, Blue), Storage (128GB, 256GB), RAM /
        ROM (8/128, 12/256), Size or Screen size. Add up to {VARIANT_OPTION_MAX}{" "}
        options; every combination becomes one row below. Leave this empty for a
        single-price product.
      </p>

      <datalist id="variant-option-suggestions">
        {VARIANT_OPTION_SUGGESTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {value.options.map((option, index) => (
        <div
          key={index}
          className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50/60 p-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-48 shrink-0 space-y-1">
              <AdminFormLabel htmlFor={`variant-option-name-${index}`}>
                Option {index + 1}
              </AdminFormLabel>
              <Input
                id={`variant-option-name-${index}`}
                list="variant-option-suggestions"
                placeholder="e.g. Storage"
                maxLength={VARIANT_OPTION_NAME_MAX}
                value={option.name}
                disabled={disabled}
                onChange={(event) => updateOption(index, { name: event.target.value })}
                className={adminFormControlClass}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <AdminFormLabel htmlFor={`variant-option-values-${index}`}>
                Values
              </AdminFormLabel>
              <div
                className={cn(
                  adminFormControlClass,
                  "flex h-auto min-h-9 flex-wrap items-center gap-1.5 py-1",
                )}
              >
                {option.values.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded bg-[#3897f0]/10 px-2 py-0.5 text-xs font-medium text-[#1f6fc4]"
                  >
                    {item}
                    <button
                      type="button"
                      aria-label={`Remove ${item}`}
                      disabled={disabled}
                      className="text-[#1f6fc4]/70 hover:text-red-600"
                      onClick={() =>
                        updateOption(index, {
                          values: option.values.filter((v) => v !== item),
                        })
                      }
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
                <input
                  id={`variant-option-values-${index}`}
                  className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                  placeholder={
                    option.values.length ? "Add another…" : "Type a value, press Enter"
                  }
                  value={drafts[index] ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    setDrafts((current) =>
                      current.map((d, i) => (i === index ? event.target.value : d)),
                    )
                  }
                  onKeyDown={(event) => onValueKeyDown(index, event)}
                  onBlur={() => addValues(index, drafts[index] ?? "")}
                />
              </div>
            </div>
            <button
              type="button"
              className="mt-5 self-start text-xs font-medium text-red-600 hover:underline"
              disabled={disabled}
              onClick={() => removeOption(index)}
            >
              Remove
            </button>
          </div>
          {option.values.length > 0 && !option.name.trim() ? (
            <p className="text-xs text-red-600">Give this option a name.</p>
          ) : null}
        </div>
      ))}

      {value.options.length < VARIANT_OPTION_MAX ? (
        <AdminFormDashedButton onClick={() => addOption()}>
          {value.options.length === 0 ? "Add variant option" : "Add another option"}
        </AdminFormDashedButton>
      ) : null}

      {tooMany ? (
        <p className="text-xs font-medium text-red-600">
          {combos} combinations — a product can have at most {PRODUCT_VARIANT_MAX}{" "}
          variants. Remove some values; the table below was not changed.
        </p>
      ) : null}

      {value.rows.length > 0 ? (
        <>
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-neutral-200 p-3">
            <p className="w-full text-xs font-medium text-neutral-600">
              Apply to all {value.rows.length} variants (blank = leave as is)
            </p>
            <div className="w-28 shrink-0">
              <Input
                aria-label="Price for all variants"
                placeholder="Price"
                inputMode="decimal"
                value={bulk.price}
                onChange={(event) => setBulk({ ...bulk, price: event.target.value })}
                className={adminFormControlClass}
              />
            </div>
            <div className="w-32 shrink-0">
              <Input
                aria-label="Regular price for all variants"
                placeholder="Regular price"
                inputMode="decimal"
                value={bulk.compareAt}
                onChange={(event) => setBulk({ ...bulk, compareAt: event.target.value })}
                className={adminFormControlClass}
              />
            </div>
            <div className="w-24 shrink-0">
              <Input
                aria-label="Stock for all variants"
                placeholder="Stock"
                inputMode="numeric"
                value={bulk.quantity}
                onChange={(event) => setBulk({ ...bulk, quantity: event.target.value })}
                className={adminFormControlClass}
              />
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={applyBulk}
              className="h-9 rounded-md bg-neutral-800 px-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              Apply
            </button>
            <button
              type="button"
              disabled={disabled || !productSku.trim()}
              onClick={fillSkus}
              className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              title={productSku.trim() ? undefined : "Enter the product SKU first"}
            >
              Fill empty SKUs
            </button>
          </div>

          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold text-neutral-600">
                <tr>
                  <th className="px-2 py-2">Image</th>
                  <th className="px-2 py-2">Variant</th>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Price (৳)</th>
                  <th className="px-2 py-2">Regular (৳)</th>
                  <th className="px-2 py-2">Stock</th>
                  <th className="px-2 py-2">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {value.rows.map((row, index) => {
                  const label = variantDisplayName(row.optionValues);
                  return (
                    <tr
                      key={variantComboKey(row.optionValues)}
                      className={cn(!row.isActive && "bg-neutral-50 text-neutral-400")}
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Image for ${label}`}
                            onClick={() => setPickerRow(index)}
                            className="relative flex size-10 items-center justify-center overflow-hidden rounded border border-dashed border-neutral-300 bg-white text-neutral-400 hover:border-neutral-400"
                          >
                            {row.imageSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element -- admin preview of media picker paths
                              <img
                                src={row.imageSrc}
                                alt=""
                                className="absolute inset-0 size-full object-contain p-0.5"
                              />
                            ) : (
                              <ImagePlus className="size-4" aria-hidden />
                            )}
                          </button>
                          {row.imageSrc ? (
                            <button
                              type="button"
                              aria-label={`Remove image for ${label}`}
                              disabled={disabled}
                              onClick={() => updateRow(index, { imageSrc: "" })}
                              className="text-neutral-400 hover:text-red-600"
                            >
                              <X className="size-3.5" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.optionValues.map((item, i) => (
                            <span
                              key={`${i}-${item}`}
                              title={optionNames[i]}
                              className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-36 shrink-0">
                          <Input
                            aria-label={`SKU for ${label}`}
                            value={row.sku}
                            maxLength={PRODUCT_SKU_MAX}
                            disabled={disabled}
                            onChange={(event) => updateRow(index, { sku: event.target.value })}
                            className={cn(adminFormControlClass, "font-mono text-xs")}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-24 shrink-0">
                          <Input
                            aria-label={`Price for ${label}`}
                            inputMode="decimal"
                            value={row.price}
                            disabled={disabled}
                            onChange={(event) => updateRow(index, { price: event.target.value })}
                            className={adminFormControlClass}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-24 shrink-0">
                          <Input
                            aria-label={`Regular price for ${label}`}
                            inputMode="decimal"
                            placeholder="—"
                            value={row.compareAt}
                            disabled={disabled}
                            onChange={(event) => updateRow(index, { compareAt: event.target.value })}
                            className={adminFormControlClass}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-16 shrink-0">
                          <Input
                            aria-label={`Stock for ${label}`}
                            inputMode="numeric"
                            value={row.quantity}
                            disabled={disabled}
                            onChange={(event) => updateRow(index, { quantity: event.target.value })}
                            className={adminFormControlClass}
                          />
                        </div>
                        {row.reserved > 0 ? (
                          <p className="mt-0.5 text-[0.65rem] text-neutral-500">
                            {row.reserved} reserved
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <AdminToggleSwitch
                          checked={row.isActive}
                          onChange={(checked) => updateRow(index, { isActive: checked })}
                          label={`${label} active`}
                          disabled={disabled}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AdminFormPresetNote>
            {summary.active} active variant{summary.active === 1 ? "" : "s"} ·{" "}
            {summary.totalStock} in stock in total
            {summary.lowestPrice ? ` · from ৳${summary.lowestPrice.price}` : ""}. The
            product card and listings show the lowest active variant price, and the
            product&apos;s stock is the total of its variants — those two fields
            above follow the variants automatically while any are active.
          </AdminFormPresetNote>
        </>
      ) : null}

      {pickedRow ? (
        <AdminMediaPickerModal
          open
          onClose={() => setPickerRow(null)}
          onSelect={(path) => {
            if (pickerRow != null) {
              updateRow(pickerRow, { imageSrc: path });
            }
            setPickerRow(null);
          }}
          title={`Image for ${variantDisplayName(pickedRow.optionValues)}`}
          folder="products"
        />
      ) : null}
    </div>
  );
}

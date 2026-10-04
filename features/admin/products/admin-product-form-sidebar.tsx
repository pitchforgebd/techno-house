"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminToggleRow } from "@/features/admin/products/admin-toggle-switch";
import { AdminWarrantyBadge } from "@/features/admin/warranty/admin-warranty-badge";
import { AdminProductNotesFields } from "@/features/admin/products/admin-product-notes-labels-fields";
import { notifyError } from "@/components/ui/feedback-provider";
import { searchRelatedProductCandidatesAction } from "@/features/admin/products/product-actions";
import { PRODUCT_RELATED_MAX } from "@/lib/catalog/product-input";
import type { ProductWarrantyOption } from "@/lib/catalog/warranty-badge";
import type { ProductNoteOption } from "@/lib/catalog/product-notes-labels";
import { cn } from "@/lib/cn";

type SidebarProps = {
  published: boolean;
  setPublished: (value: boolean) => void;
  featured: boolean;
  setFeatured: (value: boolean) => void;
  todaysDeal: boolean;
  setTodaysDeal: (value: boolean) => void;
  refundable: boolean;
  setRefundable: (value: boolean) => void;
  warrantyEnabled: boolean;
  setWarrantyEnabled: (value: boolean) => void;
  warranties: ProductWarrantyOption[];
  warrantyOptionId: string;
  setWarrantyOptionId: (value: string) => void;
  notes: ProductNoteOption[];
  noteIds: string[];
  setNoteIds: (value: string[]) => void;
  relatedProducts: { id: string; slug: string; name: string }[];
  setRelatedProducts: (
    value: { id: string; slug: string; name: string }[],
  ) => void;
  excludeProductId?: string;
  freeShipping: boolean;
  setFreeShipping: (value: boolean) => void;
  flatRateShipping: boolean;
  setFlatRateShipping: (value: boolean) => void;
  quantityMultiply: boolean;
  setQuantityMultiply: (value: boolean) => void;
  codAvailable: boolean;
  setCodAvailable: (value: boolean) => void;
  hideStockState: boolean;
  setHideStockState: (value: boolean) => void;
  lowStockWarning: boolean;
  setLowStockWarning: (value: boolean) => void;
  clubPoint: string;
  setClubPoint: (value: string) => void;
  tax: string;
  setTax: (value: string) => void;
  vat: string;
  setVat: (value: string) => void;
  platformFee: string;
  setPlatformFee: (value: string) => void;
  shippingDays: string;
  setShippingDays: (value: string) => void;
  lowStockQty: string;
  setLowStockQty: (value: string) => void;
  stockDisplay: "quantity" | "text";
  setStockDisplay: (value: "quantity" | "text") => void;
};

function TaxField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <AdminFormLabel>{label}</AdminFormLabel>
      <div className="flex gap-0">
        <Input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(adminFormControlClass, "rounded-r-none")}
        />
        <Select
          defaultValue="flat"
          className={cn(
            adminFormControlClass,
            "w-24 shrink-0 rounded-l-none border-l-0",
          )}
        >
          <option value="flat">Flat</option>
          <option value="percent">Percent</option>
        </Select>
      </div>
    </div>
  );
}

/**
 * Real "frequently bought together" picker (Phase 4) — was two uncontrolled
 * radio buttons ("Select product" / "Select category") and a dashed
 * "Add more" button that only toasted `"(mock)"`. Backed by the real
 * `Product.relatedTo` self-relation, which already fed the storefront PDP
 * with zero admin write path.
 *
 * Only "by product" is offered — `relatedTo` has no category-level concept,
 * so a "Select category" option would have nothing real to attach to; it
 * was dropped rather than kept as a second fake control.
 */
function AdminRelatedProductsField({
  relatedProducts,
  setRelatedProducts,
  excludeProductId,
}: {
  relatedProducts: { id: string; slug: string; name: string }[];
  setRelatedProducts: (
    value: { id: string; slug: string; name: string }[],
  ) => void;
  excludeProductId?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [searching, startSearch] = useTransition();
  const [open, setOpen] = useState(false);

  function runSearch(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const found = await searchRelatedProductCandidatesAction({
        query: value,
        excludeId: excludeProductId,
      });
      setResults(
        found.filter(
          (item) => !relatedProducts.some((r) => r.id === item.id),
        ),
      );
    });
  }

  function addProduct(product: { id: string; slug: string; name: string }) {
    if (relatedProducts.length >= PRODUCT_RELATED_MAX) {
      notifyError(
        `A product can have at most ${PRODUCT_RELATED_MAX} related products.`,
      );
      return;
    }
    setRelatedProducts([...relatedProducts, product]);
    setResults((current) => current.filter((item) => item.id !== product.id));
    setQuery("");
    setOpen(false);
  }

  function removeProduct(id: string) {
    setRelatedProducts(relatedProducts.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-3">
      {relatedProducts.length > 0 ? (
        <ul className="space-y-1.5">
          {relatedProducts.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700"
            >
              <span className="truncate">{item.name}</span>
              <button
                type="button"
                onClick={() => removeProduct(item.id)}
                className="shrink-0 text-xs font-medium text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-neutral-500">
          No related products yet.
        </p>
      )}

      <div className="relative">
        <Input
          value={query}
          onChange={(event) => {
            runSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search products to add…"
          className={adminFormControlClass}
        />
        {open && query.trim() ? (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg">
            {searching ? (
              <p className="px-3 py-2 text-sm text-neutral-500">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-neutral-500">
                No matching products.
              </p>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addProduct(item)}
                  className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  {item.name}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <p className="text-xs text-neutral-500">
        Shown as &quot;Frequently bought together&quot; on the product page.
        Up to {PRODUCT_RELATED_MAX}.
      </p>
    </div>
  );
}

export function AdminProductFormSidebar(props: SidebarProps) {
  return (
    <div className="space-y-5">
      <AdminFormCard title="Product settings">
        <AdminToggleRow
          label="Published"
          checked={props.published}
          onChange={props.setPublished}
        />
        <AdminToggleRow
          label="New badge"
          checked={props.featured}
          onChange={props.setFeatured}
        />
        <AdminToggleRow
          label="Today's deal"
          checked={props.todaysDeal}
          onChange={props.setTodaysDeal}
        />
        <div className="space-y-2 border-t border-neutral-100 pt-4">
          <AdminFormLabel>Choose flash title</AdminFormLabel>
          <Select
            className={adminFormControlClass}
            defaultValue=""
            disabled
            title="Adding a product to a flash sale isn't available from this form yet — use the flash sale's own page."
          >
            <option value="">Not available from this form yet</option>
          </Select>
          <Link
            href="/admin/flash-sales/new"
            className="inline-block text-xs font-medium text-[#3897f0] hover:underline"
          >
            + New flash sale
          </Link>
          <p className="text-xs text-neutral-500">
            To put this product in a flash sale, create or open one from{" "}
            <Link href="/admin/flash-sales" className="underline">
              Flash deals
            </Link>{" "}
            and add it there. Sale % is calculated from Special vs Regular
            price on the left.
          </p>
        </div>
      </AdminFormCard>

      <AdminFormCard title="Refund">
        <AdminToggleRow
          label="Refundable"
          checked={props.refundable}
          onChange={props.setRefundable}
        />
        <AdminProductNotesFields
          notes={props.notes}
          selectedIds={props.noteIds}
          onChange={props.setNoteIds}
          types={["Refund"]}
          title="Refund notes"
          compact
        />
      </AdminFormCard>

      <AdminFormCard
        title="Clubpoint"
        headerClassName="bg-amber-50"
      >
        <AdminFormLabel>Set club point for this product</AdminFormLabel>
        <Input
          inputMode="numeric"
          value={props.clubPoint}
          onChange={(event) => props.setClubPoint(event.target.value)}
          className={adminFormControlClass}
        />
      </AdminFormCard>

      <AdminFormCard title="Warranty">
        <AdminToggleRow
          label="Enable warranty for this product"
          checked={props.warrantyEnabled}
          onChange={props.setWarrantyEnabled}
        />
        {props.warrantyEnabled ? (
          <div className="space-y-2">
            <AdminFormLabel htmlFor="product-warranty">
              Warranty (with logo)
            </AdminFormLabel>
            <div className="flex items-center gap-3">
              {(() => {
                const selected =
                  props.warranties.find(
                    (item) => item.id === props.warrantyOptionId,
                  ) ?? props.warranties[0];
                return selected ? (
                  <AdminWarrantyBadge
                    badge={selected.badge}
                    label={selected.text}
                  />
                ) : null;
              })()}
              <Select
                id="product-warranty"
                className={cn(adminFormControlClass, "min-w-0 flex-1")}
                value={props.warrantyOptionId}
                onChange={(event) =>
                  props.setWarrantyOptionId(event.target.value)
                }
              >
                {props.warranties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.badge} — {item.text}
                  </option>
                ))}
              </Select>
            </div>
            <Link
              href="/admin/warranty"
              className="inline-block text-xs font-medium text-[#3897f0] hover:underline"
            >
              Manage warranties
            </Link>
          </div>
        ) : null}
        <AdminProductNotesFields
          notes={props.notes}
          selectedIds={props.noteIds}
          onChange={props.setNoteIds}
          types={["Warranty"]}
          title="Warranty notes"
          compact
        />
      </AdminFormCard>

      <AdminFormCard title="Shipping">
        <AdminToggleRow
          label="Free shipping"
          checked={props.freeShipping}
          onChange={props.setFreeShipping}
        />
        <AdminToggleRow
          label="Flat rate"
          checked={props.flatRateShipping}
          onChange={props.setFlatRateShipping}
        />
        <AdminToggleRow
          label="Is product quantity multiply"
          checked={props.quantityMultiply}
          onChange={props.setQuantityMultiply}
        />
        <div className="space-y-2 border-t border-neutral-100 pt-4">
          <AdminFormLabel>Estimated shipping time</AdminFormLabel>
          <div className="flex gap-0">
            <Input
              value={props.shippingDays}
              onChange={(event) => props.setShippingDays(event.target.value)}
              placeholder="7-15 days"
              className={cn(adminFormControlClass, "rounded-r-none")}
            />
            <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500">
              Days
            </span>
          </div>
          <Checkbox label="Show estimated shipping time in product description page" />
          <AdminProductNotesFields
            notes={props.notes}
            selectedIds={props.noteIds}
            onChange={props.setNoteIds}
            types={["Shipping"]}
            title="Shipping notes"
            compact
          />
        </div>
      </AdminFormCard>

      <AdminFormCard title="Cash on delivery">
        <AdminToggleRow
          label="Cash on delivery available"
          checked={props.codAvailable}
          onChange={props.setCodAvailable}
        />
        <AdminProductNotesFields
          notes={props.notes}
          selectedIds={props.noteIds}
          onChange={props.setNoteIds}
          types={["Cash on delivery", "Delivery"]}
          title="Delivery / COD notes"
          compact
        />
      </AdminFormCard>

      <AdminFormCard title="Vat & TAX">
        <TaxField label="Tax" value={props.tax} onChange={props.setTax} />
        <TaxField label="Vat" value={props.vat} onChange={props.setVat} />
        <TaxField
          label="Platform fee"
          value={props.platformFee}
          onChange={props.setPlatformFee}
        />
      </AdminFormCard>

      <AdminFormCard title="Stock & order display settings">
        <AdminToggleRow
          label="Hide stock visibility state"
          checked={props.hideStockState}
          onChange={props.setHideStockState}
        />
        <fieldset className="space-y-2">
          <legend className="sr-only">Stock display</legend>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="radio"
              name="stock-display"
              checked={props.stockDisplay === "quantity"}
              onChange={() => props.setStockDisplay("quantity")}
              className="accent-[#3897f0]"
            />
            Show stock quantity
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="radio"
              name="stock-display"
              checked={props.stockDisplay === "text"}
              onChange={() => props.setStockDisplay("text")}
              className="accent-[#3897f0]"
            />
            Show stock with text only
          </label>
        </fieldset>
        <AdminToggleRow
          label="Low stock quantity warning"
          checked={props.lowStockWarning}
          onChange={props.setLowStockWarning}
        />
        <div className="space-y-1.5">
          <AdminFormLabel>Quantity</AdminFormLabel>
          <Input
            inputMode="numeric"
            value={props.lowStockQty}
            onChange={(event) => props.setLowStockQty(event.target.value)}
            className={cn(adminFormControlClass, "max-w-[6rem]")}
          />
        </div>
      </AdminFormCard>

      <AdminFormCard title="Frequently bought">
        <AdminRelatedProductsField
          relatedProducts={props.relatedProducts}
          setRelatedProducts={props.setRelatedProducts}
          excludeProductId={props.excludeProductId}
        />
      </AdminFormCard>
    </div>
  );
}

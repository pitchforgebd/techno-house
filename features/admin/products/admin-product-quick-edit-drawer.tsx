"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { updateAdminProductQuickFieldsAction } from "@/features/admin/products/product-actions";
import {
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import {
  availableUnits,
  deriveStockStatus,
} from "@/lib/catalog/inventory-input";
import type { Money } from "@/lib/data";

const STATUS_LABEL = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
} as const;

export type QuickEditProduct = {
  id: string;
  name: string;
  sku: string;
  price: Money;
  compareAtPrice: Money | null;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
};

/**
 * Admin product list -> "Quick edit" (AD-372): price, regular price and stock
 * from the row's own "..." menu, without opening the full product form. Same
 * drawer shape as `AdminProductStockDrawer`, plus the two price fields.
 */
export function AdminProductQuickEditDrawer({
  product,
  open,
  canEdit,
  onClose,
}: {
  product: QuickEditProduct | null;
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [price, setPrice] = useState(
    product ? String(product.price.amount) : "0",
  );
  const [compareAt, setCompareAt] = useState(
    product?.compareAtPrice ? String(product.compareAtPrice.amount) : "",
  );
  const [quantity, setQuantity] = useState(
    product ? String(product.quantity) : "0",
  );
  const [threshold, setThreshold] = useState(
    product ? String(product.lowStockThreshold) : "5",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open || !product) {
    return null;
  }

  const qty = Number.parseInt(quantity, 10);
  const low = Number.parseInt(threshold, 10);
  const preview = deriveStockStatus(
    Number.isFinite(qty) ? qty : 0,
    product.reserved,
    Number.isFinite(low) ? low : 0,
  );
  const available = availableUnits(
    Number.isFinite(qty) ? qty : 0,
    product.reserved,
  );

  function handleSave() {
    if (!product) {
      return;
    }
    if (!canEdit) {
      notifyError("You do not have permission to edit products.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateAdminProductQuickFieldsAction({
        productId: product.id,
        fields: { price, compareAt, quantity, lowStockThreshold: threshold },
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save.");
        return;
      }
      notifySuccess("Product updated");
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close quick edit"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-edit-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2
              id="quick-edit-drawer-title"
              className="text-lg font-semibold text-neutral-800"
            >
              Quick edit
            </h2>
            <p className="mt-1 text-sm text-text-muted">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-sm text-neutral-600">SKU {product.sku}</p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="quick-edit-price" required>
                Price
              </AdminFormLabel>
              <Input
                id="quick-edit-price"
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className={adminFormControlClass}
                disabled={pending || !canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="quick-edit-compare-at">
                Regular price
              </AdminFormLabel>
              <Input
                id="quick-edit-compare-at"
                inputMode="numeric"
                placeholder="Optional"
                value={compareAt}
                onChange={(event) => setCompareAt(event.target.value)}
                className={adminFormControlClass}
                disabled={pending || !canEdit}
              />
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Leave regular price blank to sell at Price with no strike-through.
            A regular price above Price turns the Sale badge on; clearing it
            here never turns Today&apos;s deal off.
          </p>

          <div className="border-t border-neutral-100 pt-4">
            <p className="mb-3 text-sm font-medium text-neutral-700">Stock</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="quick-edit-qty">
                  Quantity
                </AdminFormLabel>
                <Input
                  id="quick-edit-qty"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className={adminFormControlClass}
                  disabled={pending || !canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="quick-edit-threshold">
                  Low-stock at
                </AdminFormLabel>
                <Input
                  id="quick-edit-threshold"
                  inputMode="numeric"
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                  className={adminFormControlClass}
                  disabled={pending || !canEdit}
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              Reserved {product.reserved} · Available {available} ·{" "}
              {STATUS_LABEL[preview]}
            </p>
          </div>

          {canEdit ? (
            <Button type="button" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { updateAdminProductStockAction } from "@/features/admin/products/product-actions";
import {
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import {
  availableUnits,
  deriveStockStatus,
} from "@/lib/catalog/inventory-input";

const STATUS_LABEL = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
} as const;

export function AdminProductStockDrawer({
  product,
  open,
  canEdit,
  onClose,
}: {
  product: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    reserved: number;
    lowStockThreshold: number;
  } | null;
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
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
      const result = await updateAdminProductStockAction({
        productId: product.id,
        fields: { quantity, lowStockThreshold: threshold },
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not update stock.");
        return;
      }
      notifySuccess("Stock updated");
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close stock details"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2
              id="stock-drawer-title"
              className="text-lg font-semibold text-neutral-800"
            >
              Stock
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

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-neutral-600">SKU {product.sku}</p>
          <p className="text-sm text-neutral-600">
            Reserved {product.reserved} · Available {available} ·{" "}
            {STATUS_LABEL[preview]}
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="space-y-1.5">
            <AdminFormLabel htmlFor="drawer-stock-qty">Quantity</AdminFormLabel>
            <Input
              id="drawer-stock-qty"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={adminFormControlClass}
              disabled={pending || !canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <AdminFormLabel htmlFor="drawer-stock-threshold">
              Low-stock threshold
            </AdminFormLabel>
            <Input
              id="drawer-stock-threshold"
              inputMode="numeric"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className={adminFormControlClass}
              disabled={pending || !canEdit}
            />
          </div>
          {canEdit ? (
            <Button type="button" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save stock"}
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

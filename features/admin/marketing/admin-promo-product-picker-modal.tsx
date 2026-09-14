"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyError } from "@/components/ui/feedback-provider";
import type { PromoCatalogProduct } from "@/lib/admin/promotions-offers-mock";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminPromoProductPickerModal({
  open,
  title,
  products,
  categories,
  onClose,
  onAdded,
  confirmLabel = "Add",
}: {
  open: boolean;
  title: string;
  products: PromoCatalogProduct[];
  categories: { slug: string; name: string }[];
  onClose: () => void;
  onAdded?: (ids: string[]) => void;
  confirmLabel?: string;
}) {
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.categorySlug !== category) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        product.name.toLowerCase().includes(query) ||
        product.brandName.toLowerCase().includes(query)
      );
    });
  }, [products, category, q]);

  if (!open) {
    return null;
  }

  function handleAdd() {
    if (selected.size === 0) {
      notifyError("Select at least one product first.");
      return;
    }
    const ids = [...selected];
    onAdded?.(ids);
    setSelected(new Set());
    setQ("");
    setCategory("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-picker-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2
            id="promo-picker-title"
            className="text-lg font-semibold text-neutral-800"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-3 border-b border-neutral-100 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              aria-label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={controlClass}
            >
              <option value="">Choose Category</option>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search by Product Name"
              className={controlClass}
            />
          </div>
        </div>

        <div className="min-h-[220px] flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-neutral-400">
              No products match your filters.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {filtered.slice(0, 40).map((product) => {
                const checked = selected.has(product.id);
                return (
                  <li key={product.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 py-2.5",
                        checked ? "bg-sky-50/60" : "",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(product.id)) {
                              next.delete(product.id);
                            } else {
                              next.add(product.id);
                            }
                            return next;
                          });
                        }}
                        className="size-4 rounded border-neutral-300 text-[#3897f0]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-800">
                          {product.name}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {product.brandName} · {product.categoryName}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-neutral-700">
                        {product.priceLabel}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-neutral-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[6.5rem] rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="min-w-[6.5rem] rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

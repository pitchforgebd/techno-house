"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { saveAdminProductFormOrderAction } from "@/features/admin/products/product-form-layout-actions";
import {
  DEFAULT_PRODUCT_FORM_ORDER,
  getProductFormSectionLabel,
  type ProductFormSectionId,
} from "@/lib/catalog/product-form-layout";
import { cn } from "@/lib/cn";

/**
 * Admin -> Catalog -> Product form layout (AD-383). Reorders the section
 * sequence on every Add/Edit product form — real drag-and-drop for the mouse,
 * up/down buttons alongside it for keyboard and touch. Purely a display
 * order: no section is ever added, removed, or renamed here.
 */
export function AdminProductFormLayout({
  initialOrder,
}: {
  initialOrder: ProductFormSectionId[];
}) {
  const [order, setOrder] = useState(initialOrder);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  function moveTo(from: number, to: number) {
    if (from === to || to < 0 || to >= order.length) {
      return;
    }
    setOrder((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      if (!item) {
        return current;
      }
      next.splice(to, 0, item);
      return next;
    });
    setDirty(true);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveAdminProductFormOrderAction(order);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not save the layout.");
        return;
      }
      notifySuccess("Product form layout saved");
      setDirty(false);
    });
  }

  function handleReset() {
    setOrder(DEFAULT_PRODUCT_FORM_ORDER);
    setDirty(true);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Product form layout
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Drag a section to reorder it, or use the arrows. This changes the
          section order on every Add/Edit product form — for every admin, on
          every product.
        </p>
      </div>

      <ul className="space-y-2 rounded-md border border-border bg-surface p-2">
        {order.map((id, index) => {
          const label = getProductFormSectionLabel(id);
          return (
            <li
              key={id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) {
                  moveTo(dragIndex, index);
                }
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "flex items-center gap-3 rounded-md border border-border bg-surface-muted/40 px-3 py-2.5 transition-opacity",
                dragIndex === index ? "opacity-40" : null,
              )}
            >
              <GripVertical
                className="size-4 shrink-0 cursor-grab text-text-muted"
                aria-hidden
              />
              <span className="flex-1 text-label font-medium text-text">
                {label}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={`Move ${label} up`}
                  disabled={index === 0}
                  onClick={() => moveTo(index, index - 1)}
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-surface disabled:opacity-30"
                >
                  <ChevronUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${label} down`}
                  disabled={index === order.length - 1}
                  onClick={() => moveTo(index, index + 1)}
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-surface disabled:opacity-30"
                >
                  <ChevronDown className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!dirty || pending} onClick={handleSave}>
          {pending ? "Saving…" : "Save order"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-border"
          onClick={handleReset}
          disabled={pending}
        >
          Reset to default
        </Button>
      </div>
    </div>
  );
}

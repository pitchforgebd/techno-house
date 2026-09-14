"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { saveLabelAction } from "@/features/admin/catalog/preset-actions";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminLabelBadge } from "@/features/admin/labels/admin-label-badge";
import type {
  AdminCustomLabel,
  AdminLabelTextTone,
} from "@/lib/admin/labels-mock";
import type { ProductSummary } from "@/lib/data";
import { cn } from "@/lib/cn";

export function AdminLabelForm({
  mode,
  initial,
  products,
}: {
  mode: "create" | "edit";
  initial?: AdminCustomLabel | null;
  products: ProductSummary[];
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [backgroundColor, setBackgroundColor] = useState(
    initial?.backgroundColor ?? "#3897f0",
  );
  const [textTone, setTextTone] = useState<AdminLabelTextTone>(
    initial?.textTone ?? "light",
  );
  const [productIds, setProductIds] = useState<string[]>(
    initial?.productIds ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedProducts = useMemo(
    () => products.filter((item) => productIds.includes(item.id)),
    [products, productIds],
  );

  const pickerProducts = useMemo(() => {
    const needle = pickerQuery.trim().toLowerCase();
    return products
      .filter((item) => !productIds.includes(item.id))
      .filter((item) =>
        needle
          ? item.name.toLowerCase().includes(needle) ||
            item.sku.toLowerCase().includes(needle)
          : true,
      )
      .slice(0, 12);
  }, [products, productIds, pickerQuery]);

  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!text.trim()) {
      setError("Enter label text.");
      return;
    }
    // The server accepts 6-digit hex only, so match that here rather than
    // letting a 3-digit value fail server-side after a round trip.
    if (!/^#[0-9a-fA-F]{6}$/.test(backgroundColor.trim())) {
      setError("Enter a valid 6-digit hex background color (e.g. #e1e1e1).");
      return;
    }
    startTransition(async () => {
      const result = await saveLabelAction({
        id: initial?.id,
        text: text.trim(),
        backgroundColor: backgroundColor.trim(),
        textTone,
        productIds,
      });
      if (!result.ok) {
        setError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess({
        title: mode === "create" ? "Custom label saved" : "Custom label updated",
        description: text.trim(),
      });
      router.push("/admin/labels");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSave}
      className="mx-auto max-w-3xl space-y-5 pb-10"
    >
      <div>
        <p className="text-caption font-medium text-primary">
          <Link href="/admin/labels" className="hover:underline">
            Labels
          </Link>
          <span className="text-text-muted">
            {" "}
            / {mode === "create" ? "New" : "Edit"}
          </span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-800">
          {mode === "create" ? "Add custom label" : "Edit custom label"}
        </h1>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <AdminFormCard title="Custom label information">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="label-text" required>
            Text
          </AdminFormLabel>
          <Input
            id="label-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Text"
            className={adminFormControlClass}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="label-bg" required>
            Background color
          </AdminFormLabel>
          <div className="relative">
            <Input
              id="label-bg"
              value={backgroundColor}
              onChange={(event) => setBackgroundColor(event.target.value)}
              placeholder="Ex: #e1e1e1"
              className={cn(adminFormControlClass, "pr-12")}
            />
            <input
              type="color"
              aria-label="Pick background color"
              value={
                /^#[0-9a-fA-F]{6}$/.test(backgroundColor)
                  ? backgroundColor
                  : "#3897f0"
              }
              onChange={(event) => setBackgroundColor(event.target.value)}
              className="absolute right-2 top-1/2 size-6 -translate-y-1/2 cursor-pointer overflow-hidden rounded border border-neutral-200 bg-transparent p-0"
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <AdminFormLabel required>Select text color</AdminFormLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                { value: "light", title: "Light" },
                { value: "dark", title: "Dark" },
              ] as const
            ).map((option) => {
              const active = textTone === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTextTone(option.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-4 py-4 text-left transition-colors",
                    active
                      ? "border-[#3897f0] bg-blue-50/40"
                      : "border-neutral-200 hover:border-neutral-300",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border-2",
                      active
                        ? "border-[#3897f0]"
                        : "border-neutral-300",
                    )}
                  >
                    {active ? (
                      <span className="size-2.5 rounded-full bg-[#3897f0]" />
                    ) : null}
                  </span>
                  <span className="text-sm font-medium text-neutral-800">
                    {option.title}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {text.trim() ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-neutral-700">Preview</p>
            <AdminLabelBadge
              text={text.trim()}
              backgroundColor={
                /^#[0-9a-fA-F]{3,8}$/.test(backgroundColor.trim())
                  ? backgroundColor.trim()
                  : "#e5e7eb"
              }
              textTone={textTone}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <AdminFormLabel>Products</AdminFormLabel>
          {selectedProducts.length > 0 ? (
            <ul className="space-y-2">
              {selectedProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-neutral-800">
                    {product.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${product.name}`}
                    onClick={() =>
                      setProductIds((ids) =>
                        ids.filter((id) => id !== product.id),
                      )
                    }
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center">
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#3897f0] hover:underline"
            >
              <Plus className="size-4" aria-hidden />
              Add product
            </button>
          </div>
          {pickerOpen ? (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <Input
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                placeholder="Search products..."
                className={cn(adminFormControlClass, "mb-2")}
              />
              {pickerProducts.length === 0 ? (
                <p className="px-1 py-2 text-xs text-neutral-500">
                  No matching products.
                </p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {pickerProducts.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1.5 text-left text-sm text-neutral-800 hover:bg-white"
                        onClick={() => {
                          setProductIds((ids) => [...ids, product.id]);
                          setPickerQuery("");
                        }}
                      >
                        {product.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/admin/labels"
            className={buttonClassName({
              variant: "ghost",
              className: "border border-neutral-200",
            })}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={pending}
            className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </AdminFormCard>
    </form>
  );
}

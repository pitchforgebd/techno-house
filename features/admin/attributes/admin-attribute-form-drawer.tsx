"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { saveAdminAttributeAction } from "@/features/admin/attributes/attribute-actions";
import type { AdminAttribute } from "@/lib/admin/attributes-mock";
import {
  ATTRIBUTE_NAME_MAX,
  ATTRIBUTE_VALUE_MAX,
  slugifyAttributeKey,
} from "@/lib/catalog/attribute-input";
import { cn } from "@/lib/cn";

type FormMode = "create" | "edit";

function AttributeFormFields({
  mode,
  attribute,
  canSave,
  onClose,
}: {
  mode: FormMode;
  attribute: AdminAttribute | null;
  canSave: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(attribute?.name ?? "");
  const [key, setKey] = useState(attribute?.key ?? "");
  const [position, setPosition] = useState(
    attribute ? String(attribute.position) : "0",
  );
  const [isFilterable, setIsFilterable] = useState(
    attribute?.isFilterable ?? true,
  );
  const [values, setValues] = useState<string[]>(
    attribute?.values.length ? [...attribute.values] : [""],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateValue(index: number, value: string) {
    setValues((current) =>
      current.map((item, i) => (i === index ? value : item)),
    );
  }

  function addValue() {
    setValues((current) => [...current, ""]);
  }

  function removeValue(index: number) {
    setValues((current) =>
      current.length <= 1 ? [""] : current.filter((_, i) => i !== index),
    );
  }

  function handleConfirm() {
    setError(null);
    if (!canSave) {
      setError("You do not have permission to save attributes.");
      return;
    }

    startTransition(async () => {
      const result = await saveAdminAttributeAction({
        currentId: mode === "edit" ? attribute?.id : undefined,
        fields: {
          name,
          key,
          values,
          isFilterable,
          position,
        },
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the attribute.");
        return;
      }
      notifySuccess(
        mode === "create" ? "Attribute created" : "Attribute saved",
      );
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <div className="th-scroll-hide min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="attr-name" required>
            Attribute name
          </AdminFormLabel>
          <Input
            id="attr-name"
            placeholder="Name"
            value={name}
            maxLength={ATTRIBUTE_NAME_MAX}
            onChange={(event) => {
              const next = event.target.value;
              setName(next);
              if (mode === "create") {
                setKey(slugifyAttributeKey(next));
              }
            }}
            className={adminFormControlClass}
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="attr-key" required>
            Filter key
          </AdminFormLabel>
          <Input
            id="attr-key"
            placeholder="processor"
            value={key}
            onChange={(event) =>
              setKey(slugifyAttributeKey(event.target.value))
            }
            className={adminFormControlClass}
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">
            Used on category filters and product attribute maps.
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="attr-position">
            Ordering number
          </AdminFormLabel>
          <Input
            id="attr-position"
            inputMode="numeric"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={isFilterable}
            onChange={(event) => setIsFilterable(event.target.checked)}
            className="size-4 rounded border-border accent-[#3897f0]"
            disabled={pending}
          />
          Use as a storefront filter
        </label>

        <div className="space-y-3">
          <AdminFormLabel required>Attribute value</AdminFormLabel>
          {values.map((value, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Enter attribute value"
                value={value}
                maxLength={ATTRIBUTE_VALUE_MAX}
                onChange={(event) => updateValue(index, event.target.value)}
                className={adminFormControlClass}
                disabled={pending}
              />
              {values.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Remove value ${index + 1}`}
                  onClick={() => removeValue(index)}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                  disabled={pending}
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={addValue}
            disabled={pending}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-600",
              "hover:border-neutral-400 hover:bg-neutral-50",
            )}
          >
            <Plus className="size-4" aria-hidden />
            Add more
          </button>
          <p className="text-xs text-neutral-500">
            Suggested values for this filter. Product facets still use values
            assigned on products.
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t border-neutral-100 px-5 py-4">
        <Button
          type="button"
          onClick={handleConfirm}
          className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
          disabled={pending || !canSave}
        >
          {pending ? "Saving…" : "Confirm"}
        </Button>
      </div>
    </>
  );
}

export function AdminAttributeFormDrawer({
  open,
  mode,
  attribute,
  canSave,
  onClose,
}: {
  open: boolean;
  mode: FormMode;
  attribute: AdminAttribute | null;
  canSave: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const formKey = `${mode}-${attribute?.id ?? "new"}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close attribute form"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attribute-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <h2
            id="attribute-drawer-title"
            className="text-lg font-semibold text-neutral-800"
          >
            {mode === "create" ? "Add new attribute" : "Edit attribute"}
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

        <AttributeFormFields
          key={formKey}
          mode={mode}
          attribute={attribute}
          canSave={canSave}
          onClose={onClose}
        />
      </aside>
    </div>
  );
}

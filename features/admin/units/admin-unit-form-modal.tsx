"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { saveUnitAction } from "@/features/admin/catalog/preset-actions";
import {
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import type { AdminUnit } from "@/lib/admin/units-mock";

type FormMode = "create" | "edit";

function UnitFormFields({
  mode,
  unit,
  onClose,
}: {
  mode: FormMode;
  unit: AdminUnit | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(unit?.name ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    if (!name.trim()) {
      setError("Enter a unit name.");
      return;
    }
    startTransition(async () => {
      const result = await saveUnitAction({
        id: unit?.id,
        name: name.trim(),
      });
      if (!result.ok) {
        setError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess({
        title: mode === "create" ? "Unit created" : "Unit saved",
        description: name.trim(),
      });
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-4 px-5 py-5">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="unit-name" required>
            Name
          </AdminFormLabel>
          <Input
            id="unit-name"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={adminFormControlClass}
            autoFocus
          />
        </div>
      </div>
      <div className="flex justify-end border-t border-neutral-100 px-5 py-4">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
        >
          {pending ? "Saving…" : "Confirm"}
        </Button>
      </div>
    </>
  );
}

export function AdminUnitFormModal({
  open,
  mode,
  unit,
  onClose,
}: {
  open: boolean;
  mode: FormMode;
  unit: AdminUnit | null;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const formKey = `${mode}-${unit?.id ?? "new"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close unit form"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-modal-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2
            id="unit-modal-title"
            className="text-lg font-semibold text-neutral-800"
          >
            {mode === "create" ? "Add new unit" : "Edit unit"}
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
        <UnitFormFields
          key={formKey}
          mode={mode}
          unit={unit}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

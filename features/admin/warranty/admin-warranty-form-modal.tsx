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
import { saveWarrantyAction } from "@/features/admin/catalog/preset-actions";
import {
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminWarrantyBadge } from "@/features/admin/warranty/admin-warranty-badge";
import type { AdminWarranty } from "@/lib/admin/warranties-mock";
import { cn } from "@/lib/cn";

type FormMode = "create" | "edit";

function badgeFromText(text: string): string {
  const match = text.match(/(\d+)\s*(year|yr|month|mo|m)?/i);
  if (match) {
    const num = match[1];
    const unit = (match[2] ?? "y").toLowerCase();
    if (unit.startsWith("m")) {
      return `${num}M`;
    }
    return `${num}Y`;
  }
  if (/life/i.test(text)) {
    return "LT";
  }
  return text.slice(0, 2).toUpperCase() || "W";
}

function WarrantyFormFields({
  mode,
  warranty,
  onClose,
}: {
  mode: FormMode;
  warranty: AdminWarranty | null;
  onClose: () => void;
}) {
  const [text, setText] = useState(warranty?.text ?? "");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const previewBadge = warranty?.badge ?? badgeFromText(text || "W");

  function handleConfirm() {
    setError(null);
    if (!text.trim()) {
      setError("Enter warranty text.");
      return;
    }
    startTransition(async () => {
      const result = await saveWarrantyAction({
        id: warranty?.id,
        text: text.trim(),
      });
      if (!result.ok) {
        setError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess({
        title: mode === "create" ? "Warranty created" : "Warranty saved",
        description: text.trim(),
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
          <AdminFormLabel htmlFor="warranty-text" required>
            Warranty text
          </AdminFormLabel>
          <Input
            id="warranty-text"
            placeholder="Name"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className={adminFormControlClass}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel>Logo (40×40)</AdminFormLabel>
          {mode === "edit" ? (
            <div className="mb-2">
              <AdminWarrantyBadge badge={previewBadge} label={text || "Warranty"} />
            </div>
          ) : null}
          <div className="flex gap-0">
            <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600">
              Browse
            </span>
            <Input
              readOnly
              placeholder="Choose file"
              className={cn(adminFormControlClass, "rounded-l-none")}
            />
          </div>
          <p className="text-xs text-neutral-500">
            Minimum dimensions required: 40px width × 40px height.
          </p>
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

export function AdminWarrantyFormModal({
  open,
  mode,
  warranty,
  onClose,
}: {
  open: boolean;
  mode: FormMode;
  warranty: AdminWarranty | null;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const formKey = `${mode}-${warranty?.id ?? "new"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close warranty form"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="warranty-modal-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2
            id="warranty-modal-title"
            className="text-lg font-semibold text-neutral-800"
          >
            {mode === "create" ? "Add new warranty" : "Edit warranty"}
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
        <WarrantyFormFields
          key={formKey}
          mode={mode}
          warranty={warranty}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

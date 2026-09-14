"use client";

import { useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { adminFormControlClass } from "@/features/admin/products/admin-product-form-primitives";
import { uploadProductPdfAction } from "@/features/admin/products/product-pdf-actions";
import { pdfFilenameFromSrc } from "@/lib/product/pdf-specification";
import { cn } from "@/lib/cn";

export function AdminProductPdfField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File | null) {
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadProductPdfAction(formData);
      if (!result.ok) {
        notifyError({ title: "PDF upload failed", description: result.formError });
        return;
      }
      onChange(result.path);
      notifySuccess({
        title: "PDF attached",
        description: "Save the product to keep this specification sheet.",
      });
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-0">
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-9 shrink-0 items-center rounded-l-md border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Browse"}
        </button>
        <Input
          readOnly
          value={value ? pdfFilenameFromSrc(value) : ""}
          placeholder="Choose PDF file"
          className={cn(adminFormControlClass, "rounded-l-none")}
          disabled={disabled || pending}
        />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled || pending}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          handleFile(file);
        }}
      />
      <Input
        type="url"
        value={value.startsWith("http") ? value : ""}
        placeholder="Or paste an https://… PDF URL"
        className={adminFormControlClass}
        disabled={disabled || pending}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#3897f0] hover:underline"
          >
            Preview PDF
          </a>
          <button
            type="button"
            className="font-medium text-neutral-500 hover:text-neutral-800"
            disabled={disabled || pending}
            onClick={() => onChange("")}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

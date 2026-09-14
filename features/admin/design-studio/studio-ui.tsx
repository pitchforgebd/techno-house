"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { cn } from "@/lib/cn";

const controlClass =
  "h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function StudioBackLink() {
  return (
    <Link
      href="/admin/design-studio"
      className="text-sm font-medium text-[#3897f0] hover:underline"
    >
      ← Back to Design Studio Home
    </Link>
  );
}

export function GreenUpdate({
  label = "Update",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
    >
      {label}
    </button>
  );
}

export function StudioCard({
  title,
  hint,
  children,
  onUpdate,
  updateLabel,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  onUpdate: () => void;
  updateLabel?: string;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-neutral-400">{hint}</p> : null}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
      <div className="flex justify-end px-5 pb-5">
        <GreenUpdate label={updateLabel} onClick={onUpdate} />
      </div>
    </section>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-neutral-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-xs text-neutral-400">{hint}</span> : null}
    </label>
  );
}

export function BrowseFile({
  hint,
  onPick,
}: {
  hint?: string;
  onPick?: (name: string) => void;
}) {
  const [name, setName] = useState<string | null>(null);
  return (
    <div>
      <label className="flex h-10 cursor-pointer items-center overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <span className="bg-neutral-100 px-3 py-2 font-medium text-neutral-700">
          Browse
        </span>
        <span className="truncate px-3 text-neutral-400">
          {name ?? "Choose File"}
        </span>
        <input
          type="file"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setName(file?.name ?? null);
            if (file) onPick?.(file.name);
          }}
        />
      </label>
      {hint ? <p className="mt-1 text-xs text-neutral-400">{hint}</p> : null}
    </div>
  );
}

export function DashedUpload({
  hint,
  previewSrc,
  onFile,
  disabled,
}: {
  hint?: string;
  previewSrc?: string | null;
  onFile?: (file: File) => void;
  disabled?: boolean;
}) {
  const [name, setName] = useState<string | null>(null);
  return (
    <div>
      <label
        className={cn(
          "relative flex aspect-[16/7] max-w-xs cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 hover:border-[#3897f0]",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of mixed local uploads
          <img
            src={previewSrc}
            alt=""
            className="absolute inset-0 size-full object-contain p-3"
          />
        ) : (
          <Plus className="size-8" aria-hidden />
        )}
        <input
          type="file"
          accept="image/*,.svg,.webp,.png,.jpg,.jpeg,.gif,.ico"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            setName(file?.name ?? null);
            if (file) {
              onFile?.(file);
            }
            e.target.value = "";
          }}
        />
      </label>
      {name ? (
        <p className="mt-1 text-xs text-neutral-600">Selected: {name}</p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-neutral-400">{hint}</p> : null}
    </div>
  );
}

export function ToneCards({
  value,
  onChange,
}: {
  value: "light" | "dark";
  onChange: (v: "light" | "dark") => void;
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-200">
      {(["light", "dark"] as const).map((tone) => (
        <button
          key={tone}
          type="button"
          onClick={() => onChange(tone)}
          className={cn(
            "px-4 py-3 text-sm font-medium capitalize",
            value === tone
              ? "border-[#3897f0] text-[#3897f0] ring-1 ring-[#3897f0]"
              : "text-neutral-600",
          )}
        >
          {tone}
        </button>
      ))}
    </div>
  );
}

export function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={controlClass}
        />
        <input
          type="color"
          value={value.startsWith("#") && value.length === 7 ? value : "#e62e04"}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded border border-neutral-200"
          aria-label={`${label} picker`}
        />
      </div>
    </Field>
  );
}

export { controlClass, Input, Textarea, AdminToggleSwitch, notifySuccess };

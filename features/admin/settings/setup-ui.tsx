"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { cn } from "@/lib/cn";

export const controlClass =
  "h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function SetupBackLink({
  href = "/admin/settings",
  label = "Back to Business Settings",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-[#3897f0] hover:underline"
    >
      ← {label}
    </Link>
  );
}

export function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-6">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function BlueSave({
  label = "Save",
  onClick,
  className,
}: {
  label?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg bg-[#3897f0] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#2d7fd4]",
        className,
      )}
    >
      {label}
    </button>
  );
}

export function PurpleAdd({
  label = "Add New",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-[#6c5ce7] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5b4bd4]"
    >
      {label}
    </button>
  );
}

export function SetupCard({
  title,
  hint,
  children,
  onSave,
  saveLabel = "Save",
  footer,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-neutral-400">{hint}</p> : null}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
      {footer ?? (onSave ? (
        <div className="flex justify-end px-5 pb-5">
          <BlueSave label={saveLabel} onClick={onSave} />
        </div>
      ) : null)}
    </section>
  );
}

export function InstructionCard({
  title = "Instruction",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-sky-100 bg-sky-50/80 p-5 text-sm text-sky-900">
      <h3 className="font-semibold text-sky-950">{title}</h3>
      <div className="mt-2 space-y-1 text-sky-800/90">{children}</div>
    </section>
  );
}

export { notifySuccess, Input, Select, AdminToggleSwitch };

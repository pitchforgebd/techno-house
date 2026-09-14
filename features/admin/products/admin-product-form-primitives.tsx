import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { AdminMediaPickerModal } from "@/features/admin/media/admin-media-picker";

export function AdminFormCard({
  title,
  headerClassName,
  children,
  className,
}: {
  title: string;
  headerClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "border-b border-neutral-100 px-5 py-3.5",
          headerClassName,
        )}
      >
        <h2 className="text-base font-semibold text-neutral-800">{title}</h2>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function AdminFormLabel({
  children,
  required,
  hint,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-neutral-700"
      >
        {children}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export const adminFormControlClass =
  "h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminFormInlineLink({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className = "text-xs font-medium text-[#3897f0] hover:underline";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function AdminFormUploadBox({
  label,
  required,
  sizeHint,
  previewSrc,
  previewAlt = "",
  value,
  onChange,
  folder = "products",
  disabled,
}: {
  label: string;
  required?: boolean;
  sizeHint: string;
  previewSrc?: string | null;
  previewAlt?: string;
  value?: string;
  onChange?: (path: string) => void;
  folder?: "products" | "brands" | "home" | "general" | "categories";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const displaySrc = value || previewSrc || "";
  const interactive = Boolean(onChange);

  return (
    <div className="space-y-2">
      <AdminFormLabel required={required}>{label}</AdminFormLabel>
      <p className="text-xs text-neutral-500">{sizeHint}</p>
      <button
        type="button"
        disabled={disabled || !interactive}
        aria-label={displaySrc ? `Replace ${label}` : `Upload ${label}`}
        onClick={() => {
          if (interactive) {
            setOpen(true);
          }
        }}
        className="relative flex aspect-square w-full max-w-[10rem] items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-400 transition-colors hover:border-neutral-300 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {displaySrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of media picker paths
          <img
            src={displaySrc}
            alt={previewAlt}
            className="absolute inset-0 size-full object-contain p-2"
          />
        ) : (
          <Plus className="size-8" aria-hidden />
        )}
      </button>
      {interactive && displaySrc ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange?.("")}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
        >
          Remove
        </button>
      ) : null}
      {/*
        Mounted only while open, so each opening starts from initial state.
        Keeping it permanently mounted meant the modal had to reset its own
        tab, query and error in an effect whenever `open` flipped — a reset
        that React would rather you express by remounting.
      */}
      {interactive && open ? (
        <AdminMediaPickerModal
          open
          onClose={() => setOpen(false)}
          onSelect={(path) => onChange?.(path)}
          title={label}
          folder={folder}
        />
      ) : null}
    </div>
  );
}

export function AdminFormDashedButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
    >
      <Plus className="size-4" aria-hidden />
      {children}
    </button>
  );
}

export function AdminFormPresetNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
      {children}
    </div>
  );
}

export function AdminFormDivider() {
  return <div className="border-t border-dashed border-neutral-200" />;
}

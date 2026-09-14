"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import {
  listMediaPickerAction,
  uploadMediaPickerAction,
  type MediaPickerItem,
} from "@/features/admin/media/media-picker-actions";
import type { MediaFolder } from "@/lib/admin/media-mock";
import { cn } from "@/lib/cn";

type Tab = "upload" | "library";

/** Inert subscribe: whether the DOM exists never changes during a page life. */
const NEVER_CHANGES = () => () => {};

export function AdminMediaPickerModal({
  open,
  onClose,
  onSelect,
  title = "Select image",
  folder = "general",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  title?: string;
  folder?: MediaFolder;
}) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("upload");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MediaPickerItem[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(
    (search: string) => {
      startTransition(async () => {
        const result = await listMediaPickerAction({
          q: search,
          folder: "all",
        });
        if (!result.ok) {
          setError(result.formError);
          return;
        }
        setError(null);
        setItems(result.items);
      });
    },
    [],
  );

  // The parent mounts this only while it is open, so tab/query/error start at
  // their initial values with no reset needed. All that remains is the first
  // library fetch.
  useEffect(() => {
    if (!open) {
      return;
    }
    loadLibrary("");
  }, [open, loadLibrary]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Portals need the DOM, so this renders nothing until after hydration.
  // `useSyncExternalStore` is the supported way to read a client-only fact:
  // the server snapshot is `false`, the client snapshot `true`, with no
  // setState-in-effect and no hydration mismatch. Same pattern as
  // `components/storefront/site-alert.tsx`.
  const mounted = useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );

  if (!open || !mounted) {
    return null;
  }

  function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.set("folder", folder);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadMediaPickerAction(formData);
      if (!result.ok) {
        setError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess("Image uploaded");
      onSelect(result.path);
      onClose();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close media library"
        className="absolute inset-0 bg-neutral-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[81] flex max-h-[min(36rem,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex gap-1 border-b border-neutral-100 px-4 pt-2">
          {(
            [
              { id: "upload", label: "Upload files" },
              { id: "library", label: "Media library" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-t-md px-3 py-2 text-sm font-medium",
                tab === item.id
                  ? "border border-b-0 border-neutral-200 bg-white text-[#3897f0]"
                  : "text-neutral-500 hover:text-neutral-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {tab === "upload" ? (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.svg,.webp,.png,.jpg,.jpeg,.gif"
                className="sr-only"
                disabled={pending}
                onChange={(event) => {
                  handleUpload(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-16 text-neutral-500 hover:border-[#3897f0] hover:bg-[#3897f0]/5 disabled:opacity-60"
              >
                <Upload className="size-8" aria-hidden />
                <span className="text-sm font-medium text-neutral-700">
                  {pending ? "Uploading…" : "Drop a file or click to upload"}
                </span>
                <span className="text-xs text-neutral-400">
                  PNG, JPG, WEBP, GIF, or SVG — max 5 MB
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      loadLibrary(q);
                    }
                  }}
                  placeholder="Search media…"
                  className="h-9 flex-1 rounded-md border border-neutral-200 px-3 text-sm"
                  disabled={pending}
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => loadLibrary(q)}
                  className="rounded-md bg-[#3897f0] px-4 text-sm font-medium text-white hover:bg-[#2f86d8] disabled:opacity-60"
                >
                  Search
                </button>
              </div>
              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-500">
                  {pending ? "Loading…" : "No media found. Upload a file first."}
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          onSelect(item.path);
                          onClose();
                        }}
                        className="group flex w-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white text-left hover:border-[#3897f0] hover:ring-1 hover:ring-[#3897f0]/30"
                      >
                        <span className="flex aspect-square items-center justify-center bg-neutral-50 p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.path}
                            alt={item.alt || item.filename}
                            className="max-h-full max-w-full object-contain"
                          />
                        </span>
                        <span
                          className="truncate border-t border-neutral-100 px-2 py-1.5 text-[11px] text-neutral-600 group-hover:text-neutral-900"
                          title={item.filename}
                        >
                          {item.filename}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AdminMediaImageField({
  label,
  value,
  onChange,
  hint,
  disabled,
  folder = "general",
  pickerTitle,
}: {
  label: string;
  value: string;
  onChange: (path: string) => void;
  hint?: string;
  disabled?: boolean;
  folder?: MediaFolder;
  pickerTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const fileLabel = value ? value.split("/").pop() || value : "Select or upload";

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-neutral-800">{label}</p>
      {value ? (
        <span className="relative mb-2 inline-flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-full max-w-full object-contain" />
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-0 overflow-hidden rounded-md border border-neutral-200 bg-white text-sm disabled:opacity-60"
        >
          <span className="inline-flex h-9 items-center gap-1.5 border-r border-neutral-200 bg-neutral-50 px-3 font-medium text-neutral-700">
            <ImagePlus className="size-3.5" aria-hidden />
            Select
          </span>
          <span className="max-w-[14rem] truncate px-3 text-neutral-500">
            {fileLabel}
          </span>
        </button>
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="rounded-md border border-neutral-200 px-3 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      <AdminMediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={onChange}
        title={pickerTitle ?? label}
        folder={folder}
      />
    </div>
  );
}

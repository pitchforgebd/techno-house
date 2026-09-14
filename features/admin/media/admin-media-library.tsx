"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Copy,
  Eye,
  MoreVertical,
  Trash2,
  Upload,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import {
  deleteMediaAction,
  uploadMediaAction,
} from "@/features/admin/media/media-actions";
import type { AdminMediaListResult } from "@/lib/admin/load-media";
import type { AdminMediaAsset, MediaFolder } from "@/lib/admin/media-mock";
import { mediaHref } from "@/lib/admin/support-list-params";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function MediaCardMenu({
  asset,
  onDeleted,
}: {
  asset: AdminMediaAsset;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Options for ${asset.filename}`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex size-7 items-center justify-center rounded-md bg-white/90 text-neutral-600 shadow-sm hover:bg-white hover:text-neutral-900"
      >
        <MoreVertical className="size-4" aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[10.5rem] rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          <Link
            href={`/admin/media/${asset.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={() => setOpen(false)}
          >
            <Eye className="size-3.5 text-neutral-400" aria-hidden />
            Details
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={() => {
              setOpen(false);
              void navigator.clipboard?.writeText(asset.path);
              notifySuccess("File path copied");
            }}
          >
            <Copy className="size-3.5 text-neutral-400" aria-hidden />
            Copy path
          </button>
          <button
            type="button"
            disabled={pending}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                const result = await deleteMediaAction({ ids: [asset.id] });
                if (!result.ok) {
                  notifyError(result.formError);
                  return;
                }
                notifySuccess("File deleted");
                onDeleted();
              });
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AdminMediaLibrary({ data }: { data: AdminMediaListResult }) {
  const router = useRouter();
  const { items, total, page, pageCount, params } = data;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState("");
  const [uploadFolder, setUploadFolder] = useState<MediaFolder>("general");
  const [pending, startTransition] = useTransition();
  const uploadRef = useRef<HTMLInputElement>(null);

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((i) => i.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function runBulk(value: string) {
    if (!value) {
      return;
    }
    if (selected.size === 0) {
      notifyError("Select at least one file first");
      setBulk("");
      return;
    }
    if (value === "delete") {
      startTransition(async () => {
        const result = await deleteMediaAction({ ids: [...selected] });
        if (!result.ok) {
          notifyError(result.formError);
          return;
        }
        notifySuccess(
          result.count === 1
            ? "File deleted"
            : `${result.count} files deleted`,
        );
        setSelected(new Set());
        router.refresh();
      });
    } else if (value === "download") {
      for (const id of selected) {
        const item = items.find((row) => row.id === id);
        if (item) {
          window.open(item.path, "_blank", "noopener,noreferrer");
        }
      }
      notifySuccess(
        selected.size === 1
          ? "Download started"
          : `Opened ${selected.size} files`,
      );
    }
    setBulk("");
  }

  function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    const formData = new FormData();
    formData.set("folder", uploadFolder);
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }
    startTransition(async () => {
      const result = await uploadMediaAction(formData);
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        result.count === 1
          ? "File uploaded"
          : `${result.count} files uploaded`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            All uploaded files
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {total} file{total === 1 ? "" : "s"} in the media library
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value as MediaFolder)}
            className={cn(controlClass, "w-36")}
            aria-label="Upload folder"
            disabled={pending}
          >
            <option value="general">General</option>
            <option value="products">Products</option>
            <option value="brands">Brands</option>
            <option value="categories">Categories</option>
            <option value="home">Homepage</option>
          </Select>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*,.svg,.webp,.png,.jpg,.jpeg,.gif"
            className="sr-only"
            multiple
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => uploadRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6c5ce7] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#5b4bd6] disabled:opacity-60"
          >
            <Upload className="size-4" aria-hidden />
            {pending ? "Uploading…" : "Upload New File"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <form
          method="get"
          action="/admin/media"
          className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center"
        >
          <Select
            value={bulk}
            onChange={(e) => {
              const value = e.target.value;
              setBulk(value);
              runBulk(value);
            }}
            className={cn(controlClass, "w-full sm:w-40")}
            aria-label="Bulk action"
          >
            <option value="">Bulk Action</option>
            <option value="delete">Delete selected</option>
            <option value="download">Download selected</option>
          </Select>

          <Select
            name="sort"
            defaultValue={params.sort}
            className={cn(controlClass, "w-full sm:w-44")}
            aria-label="Sort files"
            onChange={(e) => {
              router.push(
                mediaHref({
                  base: params,
                  sort: e.target.value as typeof params.sort,
                  page: 1,
                }),
              );
            }}
          >
            <option value="newest">Sort by newest</option>
            <option value="oldest">Sort by oldest</option>
            <option value="name">Sort by name</option>
          </Select>

          <Select
            name="folder"
            defaultValue={params.folder}
            className={cn(controlClass, "w-full sm:w-40")}
            aria-label="Folder filter"
            onChange={(e) => {
              router.push(
                mediaHref({
                  base: params,
                  folder: e.target.value as typeof params.folder,
                  page: 1,
                }),
              );
            }}
          >
            <option value="all">All folders</option>
            <option value="products">Products</option>
            <option value="brands">Brands</option>
            <option value="categories">Categories</option>
            <option value="home">Homepage</option>
            <option value="general">General</option>
          </Select>

          <div className="flex min-w-0 flex-1 gap-2">
            <Input
              name="q"
              type="search"
              defaultValue={params.q}
              placeholder="Search your files"
              className={cn(controlClass, "min-w-0 flex-1")}
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-[#3897f0] px-4 text-sm font-medium text-white hover:bg-[#2f86d8]"
            >
              Search
            </button>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No media found"
              description="Upload images here — they are saved to the media library."
            />
          </div>
        ) : (
          <>
            <label className="mt-5 flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="size-4 rounded border-neutral-300 text-[#3897f0] focus:ring-[#3897f0]"
              />
              Select All
            </label>

            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => {
                const isOn = selected.has(item.id);
                return (
                  <li key={item.id}>
                    <div
                      className={cn(
                        "group relative overflow-hidden rounded-lg border bg-white transition-colors",
                        isOn
                          ? "border-[#3897f0] ring-1 ring-[#3897f0]/30"
                          : "border-neutral-200 hover:border-neutral-300",
                      )}
                    >
                      <div className="absolute left-2 top-2 z-10">
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => toggleOne(item.id)}
                          aria-label={`Select ${item.filename}`}
                          className="size-4 rounded border-neutral-300 text-[#3897f0] focus:ring-[#3897f0]"
                        />
                      </div>
                      <div className="absolute right-2 top-2 z-10">
                        <MediaCardMenu
                          asset={item}
                          onDeleted={() => router.refresh()}
                        />
                      </div>
                      <Link href={`/admin/media/${item.id}`} className="block">
                        <div className="flex aspect-square items-center justify-center bg-neutral-50 p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element -- admin library mixes local SVG, uploads, and remote CDN URLs */}
                          <img
                            src={item.path}
                            alt={item.alt || item.filename}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div className="border-t border-neutral-100 px-2.5 py-2">
                          <p
                            className="truncate text-xs font-medium text-neutral-800"
                            title={item.filename}
                          >
                            {item.filename}
                          </p>
                          <p className="mt-0.5 text-[11px] text-neutral-400">
                            {item.sizeLabel}
                          </p>
                        </div>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {pageCount > 1 ? (
        <Pagination
          page={page}
          pageCount={pageCount}
          hrefForPage={(nextPage) =>
            mediaHref({ base: params, page: nextPage })
          }
        />
      ) : null}
    </div>
  );
}

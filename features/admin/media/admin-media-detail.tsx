"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { updateMediaAltAction } from "@/features/admin/media/media-actions";
import { folderLabel, type AdminMediaAsset } from "@/lib/admin/media-mock";

const controlClass =
  "h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminMediaDetail({ asset }: { asset: AdminMediaAsset }) {
  const router = useRouter();
  const [alt, setAlt] = useState(asset.alt);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {asset.filename}
        </h1>
        <Link
          href="/admin/media"
          className="mt-1 inline-block text-sm font-medium text-[#3897f0] hover:underline"
        >
          ← Back to All uploaded files
        </Link>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">File details</h2>
        </div>
        <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin detail mixes local SVG, uploads, and remote CDN URLs */}
            <img
              src={asset.path}
              alt={alt || asset.filename}
              className="max-h-64 max-w-full object-contain"
            />
          </div>

          <div className="space-y-4">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Folder</dt>
                <dd className="font-medium text-neutral-900">
                  {folderLabel(asset.folder)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Path</dt>
                <dd className="font-mono text-xs text-neutral-800">{asset.path}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Size</dt>
                <dd className="text-neutral-900">{asset.sizeLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Dimensions</dt>
                <dd className="text-neutral-900">{asset.dimensions}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Uploaded</dt>
                <dd className="text-neutral-900">{asset.uploadedAt}</dd>
              </div>
            </dl>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-neutral-800">
                Alt text
              </span>
              <Input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className={controlClass}
                disabled={pending}
              />
            </label>

            {asset.usedIn.length > 0 ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-neutral-800">
                  Used in
                </span>
                <Textarea
                  readOnly
                  value={asset.usedIn.join("\n")}
                  rows={3}
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
                />
              </label>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Link
                href="/admin/media"
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await updateMediaAltAction({
                      id: asset.id,
                      alt,
                    });
                    if (!result.ok) {
                      notifyError(result.formError);
                      return;
                    }
                    notifySuccess("File details saved");
                    router.refresh();
                  });
                }}
                className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Update"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

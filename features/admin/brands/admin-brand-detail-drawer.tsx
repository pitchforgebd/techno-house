"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import type { AdminBrandRow } from "@/lib/admin/brands-admin-mock";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-dashed border-neutral-200 py-3">
      <p className="text-sm font-semibold text-neutral-800">{label}</p>
      <div className="mt-2 text-sm text-neutral-700">{children}</div>
    </div>
  );
}

export function AdminBrandDetailDrawer({
  brand,
  open,
  onClose,
}: {
  brand: AdminBrandRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !brand) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close brand details"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="brand-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <h2
            id="brand-drawer-title"
            className="text-lg font-semibold text-neutral-800"
          >
            {brand.name}
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

        <div className="th-scroll-hide min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <DetailRow label="Brand logo">
            <span className="relative inline-flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white p-2">
              <Image
                src={brand.logoSrc}
                alt=""
                width={100}
                height={48}
                className="object-contain"
              />
            </span>
          </DetailRow>

          <DetailRow label={`Products of this brand ${brand.productCount}`}>
            <Link
              href={`/admin/products?q=${encodeURIComponent(brand.name)}`}
              className="inline-flex rounded-full border border-[#3897f0]/40 bg-white px-3 py-1.5 text-sm font-medium text-[#3897f0] hover:bg-blue-50"
            >
              View products
            </Link>
          </DetailRow>

          <DetailRow
            label={`Categories with this brand's products (${brand.categories.length})`}
          >
            {brand.categories.length === 0 ? (
              <p className="text-neutral-400">No categories yet</p>
            ) : (
              <ul className="space-y-2 border-l border-neutral-200 pl-3">
                {brand.categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/admin/categories/${category.slug}`}
                      className="text-neutral-700 hover:text-[#3897f0] hover:underline"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DetailRow>
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          <Link
            href={`/admin/brands/${brand.slug}`}
            className="inline-flex flex-1 items-center justify-center rounded-md bg-[#3897f0] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2f86d8]"
          >
            Edit brand
          </Link>
          <Link
            href={`/brand/${brand.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Storefront
          </Link>
        </div>
      </aside>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminProductRowActions } from "@/features/admin/products/admin-product-row-actions";
import { updateAdminProductFlagsAction } from "@/features/admin/products/product-actions";
import { AdminProductStockDrawer } from "@/features/admin/products/admin-product-stock-drawer";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { availableUnits } from "@/lib/catalog/inventory-input";
import type { Category, ProductSummary } from "@/lib/data";
import {
  categoryPathLabel,
  discountPercent,
  initialFeatured,
  initialPublished,
  initialTodaysDeal,
} from "@/lib/admin/product-list-mock";
import { formatMoney } from "@/lib/format/currency";

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`size-3.5 ${
            index < score
              ? "fill-amber-400 text-amber-400"
              : "fill-neutral-200 text-neutral-200"
          }`}
        />
      ))}
    </div>
  );
}

type RowFlags = {
  published: boolean;
  featured: boolean;
  todaysDeal: boolean;
};

type AdminProductRow = ProductSummary & {
  isActive: boolean;
  position: number;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  avgRating: number;
  reviewCount: number;
  salesCount: number;
};

type AdminProductTableProps = {
  items: AdminProductRow[];
  categories: Category[];
  canEdit: boolean;
  canDelete: boolean;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
};

export function AdminProductTable({
  items,
  categories,
  canEdit,
  canDelete,
  selected,
  onSelectedChange,
}: AdminProductTableProps) {
  const initialFlags = useMemo(() => {
    const map = new Map<string, RowFlags>();
    for (const product of items) {
      map.set(product.id, {
        published: initialPublished(product),
        featured: initialFeatured(product),
        todaysDeal: initialTodaysDeal(product),
      });
    }
    return map;
  }, [items]);

  const [flags, setFlags] = useState<Map<string, RowFlags>>(initialFlags);
  const [stockProduct, setStockProduct] = useState<AdminProductRow | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleSelectAll() {
    if (allSelected) {
      onSelectedChange(new Set());
      return;
    }
    onSelectedChange(new Set(items.map((product) => product.id)));
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedChange(next);
  }

  function updateFlag(
    id: string,
    key: keyof RowFlags,
    value: boolean,
    label: string,
  ) {
    if (!canEdit) {
      notifyError("You do not have permission to edit products.");
      return;
    }
    const previous = flags.get(id);
    setFlags((current) => {
      const next = new Map(current);
      const row = next.get(id);
      if (row) {
        next.set(id, { ...row, [key]: value });
      }
      return next;
    });
    startTransition(async () => {
      const result = await updateAdminProductFlagsAction({
        id,
        published: key === "published" ? value : undefined,
        featured: key === "featured" ? value : undefined,
        todaysDeal: key === "todaysDeal" ? value : undefined,
      });
      if (!result.ok) {
        if (previous) {
          setFlags((current) => {
            const next = new Map(current);
            next.set(id, previous);
            return next;
          });
        }
        notifyError(
          result.formError ?? `Could not update ${label.toLowerCase()}.`,
        );
        return;
      }
      notifySuccess(`${label} updated`);
    });
  }

  return (
    <>
      <div className="th-scroll-hide overflow-x-auto">
        <Table className="min-w-[72rem] text-caption">
          <TableHead>
            <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
              <TableHeader className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all products"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="size-4 rounded border-border"
                />
              </TableHeader>
              <TableHeader className="w-16 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Thumb
              </TableHeader>
              <TableHeader className="min-w-[14rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Name / Brand
              </TableHeader>
              <TableHeader className="min-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Category
              </TableHeader>
              <TableHeader className="min-w-[8rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Ratings
              </TableHeader>
              <TableHeader className="min-w-[9rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Price details
              </TableHeader>
              <TableHeader className="min-w-[8rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Info
              </TableHeader>
              <TableHeader className="w-24 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Published
              </TableHeader>
              <TableHeader className="w-24 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                New badge
              </TableHeader>
              <TableHeader className="w-28 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Today&apos;s deal
              </TableHeader>
              <TableHeader className="w-14 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                <span className="sr-only">Options</span>
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((product) => {
              const discount = discountPercent(product);
              const category = categoryPathLabel(
                product.categorySlug,
                categories,
              );
              const rowFlags = flags.get(product.id) ?? {
                published: initialPublished(product),
                featured: initialFeatured(product),
                todaysDeal: initialTodaysDeal(product),
              };

              return (
                <TableRow key={product.id} className="align-top">
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${product.name}`}
                      checked={selected.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="size-4 rounded border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="relative block size-12 overflow-hidden rounded-md border border-border bg-white">
                      <Image
                        src={product.image.src}
                        alt=""
                        fill
                        className="object-contain p-1"
                        sizes="48px"
                      />
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="line-clamp-2 font-medium text-[#3897f0] hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-[#3897f0]">{product.brandName}</p>
                  </TableCell>
                  <TableCell>
                    {category.parent ? (
                      <p className="text-text-muted">
                        {category.parent}
                        <span className="text-text"> / {category.name}</span>
                      </p>
                    ) : (
                      <p className="font-medium text-text">{category.name}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.reviewCount > 0 ? (
                      <>
                        <StarRating score={Math.round(product.avgRating)} />
                        <p className="mt-1 text-text">
                          {product.avgRating.toFixed(1)} out of 5.0
                        </p>
                        <p className="text-text-muted">
                          {product.reviewCount} review
                          {product.reviewCount === 1 ? "" : "s"}
                        </p>
                      </>
                    ) : (
                      <>
                        <StarRating score={0} />
                        <p className="mt-1 text-text-muted">No reviews yet</p>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-text-muted">Price</p>
                    <p className="font-semibold tabular-nums text-text">
                      {formatMoney(product.price)}
                    </p>
                    {discount != null ? (
                      <>
                        <p className="mt-2 text-text-muted">Discount</p>
                        <p className="font-medium text-pink-600">{discount}%</p>
                      </>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <p className="text-text-muted">Number of sale</p>
                    <p className="font-medium tabular-nums text-text">
                      {product.salesCount}
                    </p>
                    <p className="mt-2 text-text-muted">Stock</p>
                    <p className="font-medium tabular-nums text-text">
                      {availableUnits(product.quantity, product.reserved)}
                    </p>
                    <button
                      type="button"
                      className="mt-1 text-[#3897f0] hover:underline"
                      onClick={() => setStockProduct(product)}
                    >
                      View stock
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <AdminToggleSwitch
                      label={`Published: ${product.name}`}
                      checked={rowFlags.published}
                      onChange={(value) => {
                        if (pending) {
                          return;
                        }
                        updateFlag(product.id, "published", value, "Published");
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <AdminToggleSwitch
                      label={`New badge: ${product.name}`}
                      checked={rowFlags.featured}
                      onChange={(value) => {
                        if (pending) {
                          return;
                        }
                        updateFlag(product.id, "featured", value, "New badge");
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <AdminToggleSwitch
                      label={`Today's deal: ${product.name}`}
                      checked={rowFlags.todaysDeal}
                      onChange={(value) => {
                        if (pending) {
                          return;
                        }
                        updateFlag(
                          product.id,
                          "todaysDeal",
                          value,
                          "Today's deal",
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <AdminProductRowActions
                      productId={product.id}
                      productSlug={product.slug}
                      productName={product.name}
                      canDelete={canDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {stockProduct ? (
        <AdminProductStockDrawer
          key={stockProduct.id}
          product={stockProduct}
          open
          canEdit={canEdit}
          onClose={() => setStockProduct(null)}
        />
      ) : null}
    </>
  );
}

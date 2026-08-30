"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import type { ProductSummary, StockStatus } from "@/lib/data";
import type { BuilderSlotMeta } from "@/lib/domain/pc-builder";
import { formatMoney } from "@/lib/format/currency";

const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

function stockTone(status: StockStatus): "stock" | "neutral" | "sale" {
  if (status === "in_stock") {
    return "stock";
  }
  if (status === "out_of_stock") {
    return "sale";
  }
  return "neutral";
}

export function PcBuilderSelectedPart({
  slot,
  index,
  product,
  missingSlug,
  isResolving,
  onChange,
  onRemove,
}: {
  slot: BuilderSlotMeta;
  index: number;
  product: ProductSummary | undefined;
  missingSlug: string | null;
  isResolving: boolean;
  onChange: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-caption font-semibold tabular-nums text-text-muted"
          aria-hidden="true"
        >
          {index + 1}
        </span>

        {product ? (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-muted">
            <Image
              src={product.image.src}
              alt=""
              fill
              className="object-contain p-1"
              sizes="64px"
            />
          </span>
        ) : (
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-surface-muted text-caption text-text-muted"
            aria-hidden="true"
          >
            —
          </span>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-label font-medium text-text">{slot.label}</p>
            {slot.required ? (
              <Badge tone="neutral">Required</Badge>
            ) : (
              <Badge tone="neutral">Optional</Badge>
            )}
          </div>

          {product ? (
            <>
              <p>
                <Link
                  href={`/product/${product.slug}`}
                  className="text-body font-medium text-text hover:text-primary"
                >
                  {product.name}
                </Link>
              </p>
              <p className="text-caption text-text-muted">
                {product.brandName} · SKU {product.sku}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Badge tone={stockTone(product.stockStatus)}>
                  {STOCK_LABEL[product.stockStatus]}
                </Badge>
                <span className="tabular-nums text-label font-semibold text-text">
                  {formatMoney(product.price)}
                </span>
              </div>
            </>
          ) : isResolving ? (
            <p className="text-caption text-text-muted">
              Loading selected part…
            </p>
          ) : (
            <p className="text-caption text-text-muted">
              Selected product
              {missingSlug ? (
                <>
                  {" "}
                  (<span className="font-mono">{missingSlug}</span>)
                </>
              ) : null}{" "}
              is unavailable in the catalog. Remove it or choose another part.
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:flex-col sm:items-stretch">
          <button
            type="button"
            className={buttonClassName({
              size: "sm",
              variant: "secondary",
              className: "grow sm:grow-0",
            })}
            onClick={onChange}
          >
            Replace
          </button>
          <button
            type="button"
            className={buttonClassName({
              size: "sm",
              variant: "ghost",
              className: "grow border border-border sm:grow-0",
            })}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

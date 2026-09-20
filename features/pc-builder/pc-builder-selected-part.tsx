"use client";

import Image from "next/image";
import Link from "next/link";
import { RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { BuilderSlotIcon } from "@/features/pc-builder/builder-slot-icons";
import type { ProductSummary, StockStatus } from "@/lib/data";
import {
  builderSelectPath,
  type BuilderSlotMeta,
} from "@/lib/domain/pc-builder";
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
  product,
  missingSlug,
  isResolving,
  onRemove,
}: {
  slot: BuilderSlotMeta;
  product: ProductSummary | undefined;
  missingSlug: string | null;
  isResolving: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="bg-success/5 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <BuilderSlotIcon slotId={slot.id} className="size-5" />
        </span>

        {product ? (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
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
            …
          </span>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-label font-semibold text-text">{slot.label}</p>
            <Badge tone="stock">Selected</Badge>
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
              could not be loaded. Choose another part or try again.
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
          <Link
            href={builderSelectPath(slot.id)}
            className={buttonClassName({
              size: "sm",
              variant: "secondary",
              className: "inline-flex grow gap-1.5 sm:grow-0",
            })}
          >
            <RefreshCw className="size-4" aria-hidden />
            Replace
          </Link>
          <button
            type="button"
            className={buttonClassName({
              size: "sm",
              variant: "ghost",
              className: "inline-flex grow gap-1.5 border border-border sm:grow-0",
            })}
            onClick={onRemove}
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

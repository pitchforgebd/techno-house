"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import type { BuilderSlot, ProductSummary, StockStatus } from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";

const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

export function PcBuilderSelectCard({
  product,
  slotId,
  selectedSlug,
  onAdd,
}: {
  product: ProductSummary;
  slotId: BuilderSlot;
  selectedSlug: string | null;
  onAdd: (slotId: BuilderSlot, slug: string) => void;
}) {
  const isSelected = product.slug === selectedSlug;
  const disabled = product.stockStatus === "out_of_stock";
  const specs = product.specs.slice(0, 6);

  return (
    <article className="flex h-full flex-col border border-border bg-surface p-4 transition-colors hover:border-primary/40">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-md bg-surface-muted">
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
            className="object-contain p-3"
          />
        </div>
        <h2 className="mt-3 line-clamp-2 min-h-10 text-label font-semibold tracking-tight text-text">
          {product.name}
        </h2>
      </Link>

      <p className="mt-1 text-caption tabular-nums text-text-muted">
        {product.sku}
      </p>

      {specs.length > 0 ? (
        <ul className="mt-2 flex-1 space-y-0.5 text-caption text-text-muted">
          {specs.map((spec) => (
            <li key={`${spec.label}-${spec.value}`} className="flex gap-1.5">
              <span aria-hidden className="text-text-muted">
                •
              </span>
              <span>
                <span className="text-text/80">{spec.label}</span>
                {" — "}
                {spec.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 flex-1 text-caption text-text-muted">
          {product.brandName}
        </p>
      )}

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body font-semibold tabular-nums text-text">
            {formatMoney(product.price)}
          </p>
          {product.compareAtPrice ? (
            <p className="text-caption tabular-nums text-text-muted line-through">
              {formatMoney(product.compareAtPrice)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {product.isNew ? <Badge tone="new">New</Badge> : null}
          {product.isSale ? <Badge tone="sale">Sale</Badge> : null}
          <Badge tone={product.stockStatus === "in_stock" ? "stock" : "neutral"}>
            {STOCK_LABEL[product.stockStatus]}
          </Badge>
        </div>
        <button
          type="button"
          disabled={disabled}
          className={buttonClassName({
            className: "inline-flex w-full gap-2 disabled:opacity-50",
          })}
          onClick={() => onAdd(slotId, product.slug)}
        >
          {isSelected ? (
            <>
              <Check className="size-4" aria-hidden />
              Added to build
            </>
          ) : (
            <>
              <Plus className="size-4" aria-hidden />
              Add to PC Builder
            </>
          )}
        </button>
      </div>
    </article>
  );
}

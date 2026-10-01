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

export type PcBuilderCardCompatibility = {
  status: "ok" | "unknown" | "incompatible";
  reason?: string;
};

export function PcBuilderSelectCard({
  product,
  slotId,
  selectedSlug,
  onAdd,
  compatibility,
}: {
  product: ProductSummary;
  slotId: BuilderSlot;
  selectedSlug: string | null;
  onAdd: (slotId: BuilderSlot, slug: string) => void;
  compatibility?: PcBuilderCardCompatibility;
}) {
  const isSelected = product.slug === selectedSlug;
  const disabled = product.stockStatus === "out_of_stock";
  const specs = product.specs.slice(0, 4);
  const incompatible = compatibility?.status === "incompatible";

  return (
    <article
      className={`flex h-full flex-col border p-3 transition-colors ${
        incompatible
          ? "border-danger/40 bg-danger/5"
          : "border-border bg-surface hover:border-primary/40"
      }`}
    >
      {compatibility && compatibility.status !== "ok" ? (
        <p
          className={`mb-1.5 text-caption font-medium ${
            incompatible ? "text-danger" : "text-text-muted"
          }`}
        >
          {incompatible
            ? (compatibility.reason ?? "May not fit your current build.")
            : "Fit not confirmed — missing spec data."}
        </p>
      ) : null}
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-sm bg-surface-muted">
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
            className="object-contain p-2.5"
          />
        </div>
        <h2 className="mt-2 line-clamp-2 min-h-10 text-label font-semibold tracking-tight text-text">
          {product.name}
        </h2>
      </Link>

      <p className="mt-0.5 text-caption tabular-nums text-text-muted">
        {product.sku}
      </p>

      {specs.length > 0 ? (
        <ul className="mt-1.5 flex-1 space-y-0.5 text-caption text-text-muted">
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
        <p className="mt-1.5 flex-1 text-caption text-text-muted">
          {product.brandName}
        </p>
      )}

      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
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
          {compatibility?.status === "unknown" ? (
            <Badge tone="neutral">Unconfirmed fit</Badge>
          ) : null}
          {incompatible ? <Badge tone="sale">May not fit</Badge> : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          className={buttonClassName({
            variant: incompatible ? "secondary" : "primary",
            size: "sm",
            className: "inline-flex w-full gap-1.5 disabled:opacity-50",
          })}
          onClick={() => onAdd(slotId, product.slug)}
        >
          {isSelected ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Added
            </>
          ) : (
            <>
              <Plus className="size-3.5" aria-hidden />
              {incompatible ? "Add anyway" : "Add to build"}
            </>
          )}
        </button>
      </div>
    </article>
  );
}

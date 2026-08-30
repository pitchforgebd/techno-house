import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { ProductListActions } from "@/features/lists/product-list-actions";
import type { ProductSummary, StockStatus } from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";

const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

function savingsLine(product: ProductSummary): string | null {
  if (!product.compareAtPrice || !product.isSale) {
    return null;
  }
  const saved = product.compareAtPrice.amount - product.price.amount;
  if (saved <= 0) {
    return null;
  }
  return `Save extra ${formatMoney({ amount: saved })} on this offer`;
}

/** Compact homepage / related style (pre UI-T02 home). */
export function ProductCard({ product }: { product: ProductSummary }) {
  const specs = product.specs.slice(0, 5);
  const stockTone = product.stockStatus === "in_stock" ? "stock" : "neutral";

  return (
    <article className="flex h-full flex-col border-b border-border pb-4">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-3"
          />
        </div>
        <h3 className="mt-3 line-clamp-2 text-label font-semibold tracking-tight text-text">
          {product.name}
        </h3>
      </Link>
      <p className="mt-1 text-caption text-text-muted">{product.brandName}</p>
      {specs.length > 0 ? (
        <p className="mt-2 text-caption text-text-muted">
          {specs.map((spec) => spec.value).join(" · ")}
        </p>
      ) : null}
      <div className="mt-3">
        <p className="font-semibold tabular-nums text-text">
          {formatMoney(product.price)}
          {product.compareAtPrice ? (
            <span className="ml-2 text-caption font-normal text-text-muted line-through">
              {formatMoney(product.compareAtPrice)}
            </span>
          ) : null}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {product.isNew ? <Badge tone="new">New</Badge> : null}
        {product.isSale ? <Badge tone="sale">Sale</Badge> : null}
        <Badge tone={stockTone}>{STOCK_LABEL[product.stockStatus]}</Badge>
        <Badge tone="warranty">{product.warrantyLabel}</Badge>
      </div>
      <div className="mt-auto space-y-2 pt-3">
        <AddToCartButton
          slug={product.slug}
          stockStatus={product.stockStatus}
          size="sm"
        />
        <ProductListActions
          slug={product.slug}
          categorySlug={product.categorySlug}
        />
      </div>
    </article>
  );
}

/** Category / shop listing card (demo IA — not a visual clone). */
export function CatalogProductCard({ product }: { product: ProductSummary }) {
  const specs = product.specs.slice(0, 5);
  const offer = savingsLine(product);

  return (
    <article className="flex h-full flex-col border border-border bg-surface p-3 transition-colors hover:border-primary/40">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-surface-muted">
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
            className="object-contain p-3"
          />
        </div>
        <h3 className="mt-3 line-clamp-2 min-h-10 text-label font-semibold tracking-tight text-text">
          {product.name}
        </h3>
      </Link>

      <p className="mt-1 text-caption tabular-nums text-text-muted">
        {product.sku}
      </p>

      {specs.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-caption text-text-muted">
          {specs.map((spec) => (
            <li key={`${spec.label}-${spec.value}`} className="flex gap-1.5">
              <span aria-hidden className="text-text-muted">
                •
              </span>
              <span>
                <span className="text-text/80">{spec.label}</span>
                {" - "}
                {spec.value}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-4 text-center">
        <p className="text-body font-semibold tabular-nums text-text">
          {formatMoney(product.price)}
        </p>
        {product.compareAtPrice ? (
          <p className="mt-0.5 text-caption tabular-nums text-text-muted line-through">
            {formatMoney(product.compareAtPrice)}
          </p>
        ) : null}
        {offer ? (
          <p className="mt-2 text-caption font-medium text-secondary">{offer}</p>
        ) : (
          <p className="mt-2 text-caption text-text-muted">
            {product.warrantyLabel}
          </p>
        )}
      </div>

      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <AddToCartButton
          slug={product.slug}
          stockStatus={product.stockStatus}
          size="sm"
        />
        <ProductListActions
          slug={product.slug}
          categorySlug={product.categorySlug}
        />
      </div>
    </article>
  );
}

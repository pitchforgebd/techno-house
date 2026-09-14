import { Badge } from "@/components/ui/badge";
import type { Money, StockStatus } from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";

const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

const STOCK_NOTE: Record<StockStatus, string> = {
  in_stock: "Available for online orders. Branch stock checks come later.",
  low_stock: "Limited online availability. Branch stock checks come later.",
  out_of_stock: "Currently unavailable for online orders.",
};

type ProductPricingProps = {
  price: Money;
  compareAtPrice: Money | null;
  stockStatus: StockStatus;
  isNew: boolean;
  isSale: boolean;
};

export function ProductPricing({
  price,
  compareAtPrice,
  stockStatus,
  isNew,
  isSale,
}: ProductPricingProps) {
  const savings =
    compareAtPrice && compareAtPrice.amount > price.amount
      ? compareAtPrice.amount - price.amount
      : null;
  const savingsPercent =
    savings !== null && compareAtPrice
      ? Math.round((savings / compareAtPrice.amount) * 100)
      : null;

  const stockTone = stockStatus === "in_stock" ? "stock" : "neutral";

  return (
    <div className="space-y-4">
      <div>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-text">
            {formatMoney(price)}
          </span>
          {compareAtPrice ? (
            <span className="text-body tabular-nums text-text-muted line-through">
              {formatMoney(compareAtPrice)}
            </span>
          ) : null}
        </p>
        {savings !== null && savingsPercent !== null ? (
          <p className="mt-1 text-label text-success">
            You save {formatMoney({ amount: savings })} ({savingsPercent}% off)
          </p>
        ) : null}
        <p className="mt-1 text-caption text-text-muted">
          Prices are display only and are not charged at checkout yet.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {isNew ? <Badge tone="new">New</Badge> : null}
        {isSale || savings !== null ? <Badge tone="sale">Sale</Badge> : null}
        <Badge tone={stockTone}>{STOCK_LABEL[stockStatus]}</Badge>
      </div>

      <div
        className="rounded-md border border-border bg-surface-muted/60 px-3 py-2.5"
        role="status"
        aria-label={`Availability: ${STOCK_LABEL[stockStatus]}`}
      >
        <p className="text-label font-medium text-text">
          {STOCK_LABEL[stockStatus]}
        </p>
        <p className="mt-0.5 text-caption text-text-muted">
          {STOCK_NOTE[stockStatus]}
        </p>
      </div>
    </div>
  );
}

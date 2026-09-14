import Link from "next/link";
import { BadgeCheck, Tags } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/format/currency";
import type { B2BPriceList } from "@/lib/b2b/price-list";

/**
 * Wholesale-only view: what this account pays, beside retail.
 *
 * Every line is resolved server-side through the same `resolveB2BPricing`
 * the product page and order creation use, so nothing here can quote a
 * price checkout would refuse.
 */
export function B2BPriceListView({ list }: { list: B2BPriceList }) {
  if (list.lines.length === 0) {
    return (
      <EmptyState
        title="Nothing priced yet"
        description="No product currently prices lower than retail for this account. Ask your account manager about wholesale terms."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/35 bg-primary-soft/50 px-4 py-3.5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BadgeCheck aria-hidden strokeWidth={1.75} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-label font-semibold text-text">
            {list.company}
            {list.tier ? ` · ${list.tier}` : ""}
          </p>
          <p className="mt-0.5 text-caption leading-relaxed text-text-muted">
            {list.discountPercent > 0
              ? `${list.discountPercent}% off retail on everything without its own negotiated price.`
              : "Prices below are the ones negotiated for your account."}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-muted/60">
              <th className="px-4 py-3 text-caption font-semibold tracking-wide text-text-muted uppercase">
                Product
              </th>
              <th className="px-4 py-3 text-caption font-semibold tracking-wide text-text-muted uppercase">
                Retail
              </th>
              <th className="px-4 py-3 text-caption font-semibold tracking-wide text-primary uppercase">
                Your price
              </th>
              <th className="px-4 py-3 text-caption font-semibold tracking-wide text-text-muted uppercase">
                Min qty
              </th>
            </tr>
          </thead>
          <tbody>
            {list.lines.map((line) => (
              <tr
                key={line.id}
                className="border-b border-border/70 last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/product/${line.slug}`}
                    className="text-label font-semibold text-text underline-offset-2 hover:text-primary hover:underline"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
                    <span className="tabular-nums">{line.sku}</span>
                    {line.negotiated ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide text-secondary uppercase">
                        <Tags aria-hidden className="size-2.5" />
                        Negotiated
                      </span>
                    ) : null}
                  </p>
                </td>
                <td className="px-4 py-3 text-label tabular-nums text-text-muted line-through">
                  {formatMoney(line.retail)}
                </td>
                <td className="px-4 py-3">
                  <span className="block text-label font-bold tabular-nums text-text">
                    {formatMoney(line.wholesale)}
                  </span>
                  <span className="mt-0.5 block text-caption tabular-nums text-success">
                    Save {formatMoney({ amount: line.savedAmount })}
                  </span>
                </td>
                <td className="px-4 py-3 text-label tabular-nums text-text">
                  {line.minQuantity > 1 ? (
                    <span className="font-semibold">{line.minQuantity} pcs</span>
                  ) : (
                    <span className="text-text-muted">1</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-caption leading-relaxed text-text-muted">
        Prices are recalculated at checkout from the same terms. Lines with a
        minimum quantity cannot be ordered below it.
      </p>
    </div>
  );
}

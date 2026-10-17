"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminSearchInput } from "@/features/admin/admin-search-input";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { saveB2BProductTermsAction } from "@/features/admin/customers/b2b-pricing-actions";
import type {
  AdminB2BPricingResult,
  AdminB2BPricingRow,
} from "@/lib/admin/b2b-pricing";
import { computeWholesalePrice } from "@/lib/b2b/pricing";
import { formatMoney } from "@/lib/format/currency";

function PricingRow({ row }: { row: AdminB2BPricingRow }) {
  const [enabled, setEnabled] = useState(row.enabled);
  const [price, setPrice] = useState(
    row.b2bAmount != null ? String(row.b2bAmount) : "",
  );
  const [percent, setPercent] = useState("");
  const [minQty, setMinQty] = useState(String(row.minQuantity));
  const [pending, startTransition] = useTransition();

  const priceAmount = Number.parseInt(price, 10) || 0;
  // % is a one-way convenience that writes into the price field — the price
  // is what actually persists, so typing a price directly still works and
  // the preview below always reflects whichever was edited last.
  function applyPercent(nextPercent: string) {
    setPercent(nextPercent);
    const pct = Number.parseFloat(nextPercent);
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      setPrice(
        String(
          computeWholesalePrice({ amount: row.retailAmount, currency: "BDT" }, pct)
            .amount,
        ),
      );
    }
  }

  const savings = row.retailAmount - priceAmount;
  const savedPercent =
    priceAmount > 0 && savings > 0
      ? Math.round((savings / row.retailAmount) * 100)
      : null;

  function save() {
    startTransition(async () => {
      const result = await saveB2BProductTermsAction({
        productId: row.productId,
        priceAmount,
        minQuantity: Number.parseInt(minQty, 10) || 1,
        enabled,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        enabled
          ? `Wholesale pricing enabled for ${row.name}`
          : `Wholesale pricing disabled for ${row.name}`,
      );
    });
  }

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-text">{row.name}</p>
        <p className="text-caption text-text-muted">
          <span className="font-mono">{row.sku}</span> · {row.categoryName}
        </p>
      </TableCell>
      <TableCell className="tabular-nums">
        {formatMoney({ amount: row.retailAmount })}
      </TableCell>
      <TableCell>
        <AdminToggleSwitch
          label={`Enable B2B pricing for ${row.name}`}
          checked={enabled}
          onChange={setEnabled}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={100}
            value={percent}
            placeholder="%"
            aria-label={`Discount percent for ${row.name}`}
            onChange={(event) => applyPercent(event.target.value)}
            disabled={!enabled}
            className="h-9 w-16 tabular-nums"
          />
          <Input
            type="number"
            min={0}
            value={price}
            placeholder="Price"
            aria-label={`Wholesale price for ${row.name}`}
            onChange={(event) => setPrice(event.target.value)}
            disabled={!enabled}
            className="h-9 w-24 tabular-nums"
          />
        </div>
        {enabled && savedPercent !== null ? (
          <p className="mt-1 text-caption text-success">
            Save {formatMoney({ amount: savings })} ({savedPercent}% off)
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          value={minQty}
          disabled={!enabled}
          aria-label={`Minimum quantity for ${row.name}`}
          onChange={(event) => setMinQty(event.target.value)}
          className="h-9 w-24 tabular-nums"
        />
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function AdminB2BPricing({ data }: { data: AdminB2BPricingResult }) {
  const buildHref = useMemo(
    () => (q: string) =>
      `/admin/customers/b2b/pricing${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    [],
  );
  const hrefForPage = useMemo(
    () => (page: number) => {
      const query = new URLSearchParams();
      if (data.q) {
        query.set("q", data.q);
      }
      if (page > 1) {
        query.set("page", String(page));
      }
      const qs = query.toString();
      return qs ? `/admin/customers/b2b/pricing?${qs}` : "/admin/customers/b2b/pricing";
    },
    [data.q],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          B2B product pricing
        </h1>
        <p className="mt-1 text-caption text-text-muted">
          Toggle a product into B2B to set its wholesale price (type a
          discount % for an instant calculated price, or type the price
          directly) and minimum order quantity. Only verified (active) B2B
          accounts ever get this price — everyone else sees the register/
          sign-in prompt on every product regardless of this toggle. Turning
          it off keeps the numbers for next time but stops this
          product&apos;s own price from applying immediately (the
          account&apos;s flat discount still applies instead).
        </p>
      </div>

      <AdminSearchInput
        defaultValue={data.q}
        buildHref={buildHref}
        placeholder="Search product name or SKU"
        aria-label="Search products"
        formClassName="max-w-md"
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader scope="col">Product</TableHeader>
              <TableHeader scope="col">Retail</TableHeader>
              <TableHeader scope="col">B2B</TableHeader>
              <TableHeader scope="col">Discount % / Wholesale price</TableHeader>
              <TableHeader scope="col">Min qty</TableHeader>
              <TableHeader scope="col">
                <span className="sr-only">Save</span>
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.rows.map((row) => (
              <PricingRow key={row.productId} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-text-muted">
          Showing {data.rows.length} of {data.total} products — page{" "}
          {data.page} of {data.pageCount}.
        </p>
        {data.pageCount > 1 ? (
          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            hrefForPage={hrefForPage}
          />
        ) : null}
      </div>
    </div>
  );
}

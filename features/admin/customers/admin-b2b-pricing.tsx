"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveB2BProductTermsAction } from "@/features/admin/customers/b2b-pricing-actions";
import type {
  AdminB2BPricingResult,
  AdminB2BPricingRow,
} from "@/lib/admin/b2b-pricing";
import { formatMoney } from "@/lib/format/currency";

function PricingRow({ row }: { row: AdminB2BPricingRow }) {
  const [price, setPrice] = useState(
    row.b2bAmount != null ? String(row.b2bAmount) : "",
  );
  const [minQty, setMinQty] = useState(String(row.minQuantity));
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveB2BProductTermsAction({
        productId: row.productId,
        priceAmount: Number.parseInt(price, 10) || 0,
        minQuantity: Number.parseInt(minQty, 10) || 1,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        Number.parseInt(price, 10) > 0
          ? `Wholesale terms saved for ${row.name}`
          : `Wholesale price cleared for ${row.name} — the account discount applies`,
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
        <Input
          type="number"
          min={0}
          value={price}
          placeholder="Account %"
          aria-label={`Wholesale price for ${row.name}`}
          onChange={(event) => setPrice(event.target.value)}
          className="h-9 w-28 tabular-nums"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          value={minQty}
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
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          B2B product pricing
        </h1>
        <p className="mt-1 text-caption text-text-muted">
          Wholesale price and minimum order quantity per product. Only verified
          (active) B2B accounts see these. Leave the price empty to fall back to
          the account&apos;s discount percentage.
        </p>
      </div>

      <form method="get" className="flex max-w-md gap-2" role="search">
        <Input
          name="q"
          defaultValue={data.q}
          placeholder="Search product name or SKU"
          aria-label="Search products"
          className="h-10"
        />
        <Button type="submit" size="sm" variant="ghost" className="border border-border">
          Search
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader scope="col">Product</TableHeader>
              <TableHeader scope="col">Retail</TableHeader>
              <TableHeader scope="col">Wholesale price</TableHeader>
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

      <p className="text-caption text-text-muted">
        Showing {data.rows.length} of {data.total} products.
      </p>
    </div>
  );
}

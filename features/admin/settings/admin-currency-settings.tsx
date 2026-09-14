"use client";

import { Eye, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import {
  AdminToggleSwitch,
  FieldRow,
  Input,
  Select,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import { saveCurrencyFormatAction } from "@/features/admin/settings/currency-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminCurrencyFormat } from "@/lib/business/currency-format";

const CURRENCY_SYMBOL = "৳";

type CurrencyRow = {
  id: string;
  name: string;
  code: string;
  symbol: string;
  enabled: boolean;
  locked?: boolean;
};

const ALL_CURRENCIES: CurrencyRow[] = [
  {
    id: "bdt",
    name: "Bangladeshi Taka",
    code: "BDT",
    symbol: "৳",
    enabled: true,
    locked: true,
  },
  {
    id: "usd",
    name: "US Dollar",
    code: "USD",
    symbol: "$",
    enabled: false,
  },
  {
    id: "eur",
    name: "Euro",
    code: "EUR",
    symbol: "â‚¬",
    enabled: false,
  },
];

export function AdminCurrencySettings({
  initial,
}: {
  initial: AdminCurrencyFormat;
}) {
  const [format, setFormat] = useState({
    decimalPlaces: String(initial.decimalPlaces),
    symbolPosition: initial.symbolPosition,
  });
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveCurrencyFormatAction(format);
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Currency formats saved");
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Currency
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          System default and display formats — BDT locked per AD-006.
        </p>
      </div>

      <SetupCard title="System Default Currency">
        <FieldRow
          label="Default currency"
          hint="BDT is the system default for Techno House v1."
        >
          <Select className={controlClass} value="BDT" disabled>
            <option value="BDT">Bangladeshi Taka (৳)</option>
          </Select>
        </FieldRow>
      </SetupCard>

      <SetupCard
        title="Set Currency Formats"
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save"}
        hint="Saved as preference; does not yet change live storefront price display."
      >
        <FieldRow label="Decimal places">
          <Input
            type="number"
            min={0}
            max={4}
            className={controlClass}
            value={format.decimalPlaces}
            onChange={(e) =>
              setFormat({ ...format, decimalPlaces: e.target.value })
            }
            disabled={pending}
          />
        </FieldRow>
        <FieldRow label="Symbol position">
          <Select
            className={controlClass}
            value={format.symbolPosition}
            onChange={(e) =>
              setFormat({
                ...format,
                symbolPosition: e.target.value as "before" | "after",
              })
            }
            disabled={pending}
          >
            <option value="before">Before amount (৳ 12,500)</option>
            <option value="after">After amount (12,500 ৳)</option>
          </Select>
        </FieldRow>
        <div className="rounded-lg bg-neutral-50 px-4 py-3">
          <p className="text-xs text-neutral-500">Preview</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
            {format.symbolPosition === "before"
              ? `${CURRENCY_SYMBOL} 12,500`
              : `12,500 ${CURRENCY_SYMBOL}`}
          </p>
        </div>
      </SetupCard>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            All Currencies
          </h2>
        </div>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader className="w-12">#</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Code</TableHeader>
              <TableHeader>Symbol</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader className="text-right">Options</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {ALL_CURRENCIES.map((currency, index) => (
              <TableRow
                key={currency.id}
                className={currency.locked ? "bg-neutral-50/50" : undefined}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{currency.name}</TableCell>
                <TableCell className="font-mono text-sm">{currency.code}</TableCell>
                <TableCell>{currency.symbol}</TableCell>
                <TableCell>
                  <AdminToggleSwitch
                    label={`Status for ${currency.code}`}
                    checked={currency.enabled}
                    onChange={() =>
                      notifyError(
                        currency.locked
                          ? "BDT must remain enabled (AD-006)."
                          : "Multi-currency is not supported in v1 — BDT is the only currency.",
                      )
                    }
                    activeClassName="bg-emerald-500"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled
                      title="Multi-currency is not supported in v1"
                      className="rounded-md border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                      aria-label={`View ${currency.code}`}
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Multi-currency is not supported in v1"
                      className="rounded-md border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                      aria-label={`Edit ${currency.code}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

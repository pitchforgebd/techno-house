"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Pencil,
  Search,
  Sparkles,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { AdminBuilderMultiSelect } from "@/features/admin/products/admin-builder-multi-select";
import {
  adminFormControlClass,
  AdminFormLabel,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminPcBuilderSubnav } from "@/features/admin/pc-builder/admin-pc-builder-subnav";
import {
  applyBulkCompatibilityAction,
  autoFillCompatibilityAction,
  clearProductBuilderSlotAction,
  saveProductCompatibilityAction,
} from "@/features/admin/pc-builder/compatibility-actions";
import { InstructionCard } from "@/features/admin/settings/setup-ui";
import type { BuilderSlot } from "@/lib/data/types/catalog";
import { parseAttrList } from "@/lib/domain/pc-builder/attr-values";
import {
  builderAttributeCopy,
  BUILDER_ATTR_VOCAB,
  SLOT_ATTRIBUTE_FIELDS,
  SLOT_REQUIRED_FIELDS,
  type BuilderAttrField,
} from "@/lib/domain/pc-builder/attribute-options";
import type {
  CompatibilityCoverageRow,
  CompatibilityProductRow,
} from "@/lib/domain/pc-builder/compat-status";
import { cn } from "@/lib/cn";

type StatusFilter = "missing" | "ready" | "all";
type Values = Partial<Record<BuilderAttrField, string>>;

/** Mirrors CompatibilityListResult in lib/pc-builder/admin-compatibility.ts (server-only). */
type ListProp = {
  rows: CompatibilityProductRow[];
  total: number;
  page: number;
  pageCount: number;
};

const PLACEHOLDER: Record<Exclude<BuilderAttrField, "tdpWatts">, string> = {
  socket: "LGA1851",
  ramType: "LPDDR5",
  formFactor: "Thin Mini-ITX",
  storageInterface: "SAS",
};

const PAGE_PATH = "/admin/pc-builder/compatibility";

function href(params: {
  slot: string;
  status: StatusFilter;
  q?: string;
  page?: number;
}): string {
  const search = new URLSearchParams({ slot: params.slot, status: params.status });
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  return `${PAGE_PATH}?${search.toString()}`;
}

function FieldInputs({
  idPrefix,
  slot,
  fields,
  values,
  onChange,
  disabled,
}: {
  idPrefix: string;
  slot: BuilderSlot;
  fields: readonly BuilderAttrField[];
  values: Values;
  onChange: (field: BuilderAttrField, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const copy = builderAttributeCopy(slot, field);
        if (field === "tdpWatts") {
          return (
            <div key={field} className="max-w-xs space-y-1.5">
              <AdminFormLabel htmlFor={`${idPrefix}-${field}`} hint={copy.hint}>
                {copy.label}
              </AdminFormLabel>
              <Input
                id={`${idPrefix}-${field}`}
                inputMode="numeric"
                value={values[field] ?? ""}
                onChange={(event) => onChange(field, event.target.value)}
                placeholder="65"
                className={adminFormControlClass}
                disabled={disabled}
              />
            </div>
          );
        }
        return (
          <AdminBuilderMultiSelect
            key={field}
            id={`${idPrefix}-${field}`}
            label={copy.label}
            hint={copy.hint}
            value={values[field] ?? ""}
            onChange={(value) => onChange(field, value)}
            options={BUILDER_ATTR_VOCAB[field]}
            otherPlaceholder={PLACEHOLDER[field]}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

function ValueCell({
  field,
  row,
  required,
}: {
  field: BuilderAttrField;
  row: CompatibilityProductRow;
  required: boolean;
}) {
  const value = row.values[field];
  const items = field === "tdpWatts" ? (value ? [`${value} W`] : []) : parseAttrList(value);
  if (items.length === 0) {
    return required ? (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
        Missing
      </span>
    ) : (
      <span className="text-xs text-neutral-300">—</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function AdminPcBuilderCompatibility({
  coverage,
  slot,
  status,
  q,
  list,
}: {
  coverage: CompatibilityCoverageRow[];
  slot: BuilderSlot;
  status: StatusFilter;
  q: string;
  list: ListProp;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Values>({});
  const [bulkValues, setBulkValues] = useState<Values>({});
  const [bulkMode, setBulkMode] = useState<"fill_empty" | "overwrite">("fill_empty");
  const [bulkKey, setBulkKey] = useState(0);

  const fields = SLOT_ATTRIBUTE_FIELDS[slot] ?? [];
  const required = SLOT_REQUIRED_FIELDS[slot] ?? [];
  const slotCoverage = coverage.find((row) => row.slot === slot);
  const allOnPageSelected =
    list.rows.length > 0 && list.rows.every((row) => selected.has(row.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allOnPageSelected ? new Set() : new Set(list.rows.map((row) => row.id)));
  }

  function startEdit(row: CompatibilityProductRow) {
    setEditingId(row.id);
    setEditValues({ ...row.values });
  }

  function save(row: CompatibilityProductRow) {
    const values: Values = {};
    for (const field of fields) values[field] = editValues[field] ?? "";
    startTransition(async () => {
      const result = await saveProductCompatibilityAction({
        productId: row.id,
        values,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Compatibility saved");
      setEditingId(null);
      router.refresh();
    });
  }

  function applyBulk() {
    startTransition(async () => {
      const result = await applyBulkCompatibilityAction({
        slot,
        productIds: [...selected],
        values: bulkValues,
        mode: bulkMode,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        `Updated ${result.updated} of ${selected.size} selected part${selected.size === 1 ? "" : "s"}`,
      );
      setSelected(new Set());
      setBulkValues({});
      setBulkKey((key) => key + 1);
      router.refresh();
    });
  }

  function autoFill() {
    startTransition(async () => {
      const result = await autoFillCompatibilityAction({ slot });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        result.updated === 0
          ? "Nothing more could be read from the product names — fill the rest in by hand."
          : `Filled ${result.updated} part${result.updated === 1 ? "" : "s"} from their names. ${result.stillMissing} in this slot still need data.`,
      );
      router.refresh();
    });
  }

  function removeFromBuilder(row: CompatibilityProductRow) {
    if (
      !window.confirm(
        `Take "${row.name}" out of the PC Builder? It stays in the shop — only its PC Builder slot and compatibility values are cleared.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await clearProductBuilderSlotAction({ productId: row.id });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Removed from the PC Builder");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-4">
          <AdminPcBuilderSubnav />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Compatibility data
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              The storefront PC Builder only suggests parts it can check against
              the rest of the build. A part with no compatibility data is hidden
              from customers by default — fill it in here and it appears.
            </p>
          </div>
        </div>
        <Link
          href="/pc-builder"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6c5ce7] hover:underline"
        >
          View storefront builder
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {coverage.map((row) => {
          const complete = row.total > 0 && row.ready === row.total;
          const percent = row.total === 0 ? 0 : Math.round((row.ready / row.total) * 100);
          return (
            <Link
              key={row.slot}
              href={href({ slot: row.slot, status: "missing" })}
              aria-current={row.slot === slot ? "true" : undefined}
              className={cn(
                "rounded-xl border bg-white p-4 shadow-sm transition-colors hover:border-[#6c5ce7]/50",
                row.slot === slot ? "border-[#6c5ce7] ring-1 ring-[#6c5ce7]/30" : "border-neutral-200",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-900">{row.label}</p>
                {complete ? (
                  <CheckCircle2 className="size-4 text-emerald-600" aria-label="All ready" />
                ) : null}
              </div>
              <p className="mt-1 text-xs tabular-nums text-neutral-500">
                {row.total === 0
                  ? "No parts yet"
                  : `${row.ready} of ${row.total} ready`}
                {row.total > row.ready ? (
                  <span className="font-medium text-amber-700">
                    {" "}
                    · {row.total - row.ready} need data
                  </span>
                ) : null}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={cn("h-full rounded-full", complete ? "bg-emerald-500" : "bg-[#6c5ce7]")}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <form action={PAGE_PATH} method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="slot" value={slot} />
            <label className="space-y-1 text-xs font-medium text-neutral-500">
              Show
              <Select
                name="status"
                defaultValue={status}
                className={cn(adminFormControlClass, "w-44")}
              >
                <option value="missing">Needs data</option>
                <option value="ready">Ready</option>
                <option value="all">All parts</option>
              </Select>
            </label>
            <label className="relative space-y-1 text-xs font-medium text-neutral-500">
              Search
              <Search
                className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-neutral-400"
                aria-hidden
              />
              <Input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Name or SKU"
                className={cn(adminFormControlClass, "w-64 pl-9")}
              />
            </label>
            <Button type="submit" size="sm" variant="ink">
              Apply
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-neutral-500">
              <span className="font-semibold text-neutral-800">
                {slotCoverage?.label ?? slot}
              </span>{" "}
              · {list.total} part{list.total === 1 ? "" : "s"} shown
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={autoFill}
              disabled={pending}
              title="Reads values written in the product names (AM5, DDR5, 650 Watt, NVMe…) and fills only the empty ones. Never overwrites."
              className="gap-1.5 border border-neutral-200"
            >
              <Sparkles className="size-3.5" aria-hidden />
              Auto-fill from product names
            </Button>
          </div>
        </div>

        {selected.size > 0 ? (
          <div className="space-y-4 border-b border-[#6c5ce7]/20 bg-[#6c5ce7]/5 px-4 py-4 sm:px-5">
            <p className="text-sm font-medium text-neutral-800">
              Apply to {selected.size} selected part{selected.size === 1 ? "" : "s"}
              <span className="ml-2 font-normal text-neutral-500">
                Leave a field blank to leave it alone.
              </span>
            </p>
            <FieldInputs
              key={bulkKey}
              idPrefix="bulk"
              slot={slot}
              fields={fields}
              values={bulkValues}
              onChange={(field, value) =>
                setBulkValues((current) => ({ ...current, [field]: value }))
              }
              disabled={pending}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={bulkMode}
                onChange={(event) =>
                  setBulkMode(event.target.value as "fill_empty" | "overwrite")
                }
                aria-label="How to apply"
                className={cn(adminFormControlClass, "w-72")}
              >
                <option value="fill_empty">Only fill parts that are empty</option>
                <option value="overwrite">Replace existing values too</option>
              </Select>
              <Button size="sm" onClick={applyBulk} disabled={pending}>
                {pending ? "Applying…" : `Apply to ${selected.size}`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
                disabled={pending}
              >
                Clear selection
              </Button>
            </div>
          </div>
        ) : null}

        {list.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center text-neutral-500">
            <CheckCircle2 className="size-10 text-emerald-500/70" aria-hidden />
            <p className="text-sm">
              {status === "missing" && !q
                ? "Every part in this slot is ready — nothing needs data."
                : "No parts match this filter."}
            </p>
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[56rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all parts on this page"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      className="size-4 rounded border-neutral-300"
                    />
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Product
                  </TableHeader>
                  {fields.map((field) => (
                    <TableHeader
                      key={field}
                      className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400"
                    >
                      {builderAttributeCopy(slot, field).label}
                      {required.includes(field) ? "" : " (optional)"}
                    </TableHeader>
                  ))}
                  <TableHeader className="w-40 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.rows.flatMap((row) => {
                  const editing = editingId === row.id;
                  const main = (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "border-b border-neutral-100",
                        editing && "bg-neutral-50",
                      )}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.name}`}
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          className="size-4 rounded border-neutral-300"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="max-w-md font-medium text-neutral-900">{row.name}</p>
                        <p className="text-xs text-neutral-500">
                          {row.sku} · {row.brandName}
                        </p>
                      </TableCell>
                      {fields.map((field) => (
                        <TableCell key={field}>
                          <ValueCell
                            field={field}
                            row={row}
                            required={required.includes(field)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => (editing ? setEditingId(null) : startEdit(row))}
                            aria-label={`${editing ? "Close editor for" : "Edit"} ${row.name}`}
                            className="inline-flex h-8 items-center gap-1 rounded-full bg-sky-100 px-3 text-xs font-medium text-[#3897f0] hover:bg-sky-200"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            {editing ? "Close" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromBuilder(row)}
                            disabled={pending}
                            aria-label={`Remove ${row.name} from the PC Builder`}
                            title="Not a PC part — remove from the PC Builder"
                            className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            <Unlink className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  if (!editing) return [main];
                  return [
                    main,
                    <TableRow key={`${row.id}-edit`} className="border-b border-neutral-100 bg-neutral-50 hover:bg-neutral-50">
                      <TableCell />
                      <TableCell colSpan={fields.length + 2}>
                        <div className="space-y-4 py-2">
                          <FieldInputs
                            idPrefix={`edit-${row.id}`}
                            slot={slot}
                            fields={fields}
                            values={editValues}
                            onChange={(field, value) =>
                              setEditValues((current) => ({ ...current, [field]: value }))
                            }
                            disabled={pending}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => save(row)} disabled={pending}>
                              {pending ? "Saving…" : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              disabled={pending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>,
                  ];
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {list.pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 text-sm text-neutral-500 sm:px-5">
            <span>
              Page {list.page} of {list.pageCount}
            </span>
            <div className="flex gap-2">
              {list.page > 1 ? (
                <Link
                  href={href({ slot, status, q, page: list.page - 1 })}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Previous
                </Link>
              ) : null}
              {list.page < list.pageCount ? (
                <Link
                  href={href({ slot, status, q, page: list.page + 1 })}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <InstructionCard>
        <p>
          Only <span className="font-medium">active</span> products are listed —
          the storefront builder never loads inactive ones. Tick several parts
          to give them the same values at once (for example every Corsair
          cooler that fits the same sockets).
        </p>
        <p>
          <span className="font-medium">Auto-fill from product names</span>{" "}
          reads what the product names already say (AM5, DDR5, &ldquo;650
          Watt&rdquo;, NVMe) and fills only empty values for this slot — it
          never overwrites, and it leaves a part alone when the name is
          unclear. Check the result afterwards; everything it sets can be
          edited here.
        </p>
        <p>
          A part can support more than one value — tick every one that applies
          (a board that takes DDR4 and DDR5, a cooler for several sockets, a
          case that holds several board sizes). The unlink button removes a
          wrongly categorised item (a charger in the PSU slot, say) from the PC
          Builder; it stays in the shop.
        </p>
      </InstructionCard>
    </div>
  );
}

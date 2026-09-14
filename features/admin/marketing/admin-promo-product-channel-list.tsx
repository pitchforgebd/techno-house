"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Frown, MoreVertical, Plus, Search, Star } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPromoProductPickerModal } from "@/features/admin/marketing/admin-promo-product-picker-modal";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import type { PromoCatalogProduct } from "@/lib/admin/promotions-offers-mock";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

type PersistResult = { ok: true } | { ok: false; formError: string };

type Props = {
  title: string;
  tabLabel: string;
  addLabel: string;
  pickerTitle: string;
  emptyTitle: string;
  assigned: PromoCatalogProduct[];
  catalog: PromoCatalogProduct[];
  categories: { slug: string; name: string }[];
  showTodaysDealToggle?: boolean;
  persist: {
    assign: (ids: string[]) => Promise<PersistResult>;
    remove: (id: string) => Promise<PersistResult>;
    bulkRemove: (ids: string[]) => Promise<PersistResult>;
    setFlag?: (id: string, on: boolean) => Promise<PersistResult>;
  };
};

export function AdminPromoProductChannelList({
  title,
  tabLabel,
  addLabel,
  pickerTitle,
  emptyTitle,
  assigned,
  catalog,
  categories,
  showTodaysDealToggle = true,
  persist,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dealOn, setDealOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(assigned.map((p) => [p.id, true])),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = [...assigned];
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brandName.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q),
      );
    }
    if (filter === "in_stock") {
      rows = rows.filter((p) => p.inStock);
    } else if (filter === "on_sale") {
      rows = rows.filter((p) => p.isSale);
    }
    rows.sort((a, b) => {
      if (sort === "price") {
        return a.priceLabel.localeCompare(b.priceLabel);
      }
      if (sort === "rating") {
        return b.rating - a.rating;
      }
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [assigned, query, sort, filter]);

  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 pt-5 sm:px-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              {title}
            </h1>
            <nav
              aria-label={`${title} views`}
              className="mt-4 flex flex-wrap items-center gap-x-5"
            >
              <span className="-mb-px border-b-2 border-[#3897f0] pb-3 text-sm font-medium text-[#3897f0]">
                {tabLabel}
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-2 pb-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-body font-medium text-[#3897f0] hover:underline"
            >
              {addLabel}
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label={addLabel}
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {formError ? (
          <div className="px-4 pt-3 sm:px-5">
            <Alert tone="danger" title="Could not update">
              <p className="text-caption">{formError}</p>
            </Alert>
          </div>
        ) : null}

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                className={cn(controlClass, "pl-9")}
              />
            </div>
            <Select
              aria-label="Bulk action"
              defaultValue=""
              disabled={pending}
              className={cn(controlClass, "lg:w-[9.5rem]")}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                event.target.value = "";
                if (value !== "remove") return;
                if (selected.size === 0) {
                  notifyError("Select at least one product first.");
                  return;
                }
                const ids = Array.from(selected);
                if (
                  !window.confirm(
                    `Remove ${ids.length} selected product${ids.length === 1 ? "" : "s"} from this list?`,
                  )
                ) {
                  return;
                }
                setFormError(null);
                startTransition(async () => {
                  const result = await persist.bulkRemove(ids);
                  if (!result.ok) {
                    setFormError(result.formError);
                    notifyError(result.formError);
                    return;
                  }
                  notifySuccess(`${ids.length} product${ids.length === 1 ? "" : "s"} removed`);
                  setSelected(new Set());
                  router.refresh();
                });
              }}
            >
              <option value="">
                {pending
                  ? "Working…"
                  : selected.size > 0
                    ? `Bulk action (${selected.size} selected)`
                    : "Bulk Action"}
              </option>
              <option value="remove">Remove from list</option>
            </Select>
            <Select
              aria-label="Filter"
              value={filter}
              className={cn(controlClass, "lg:w-[8rem]")}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">Filter</option>
              <option value="in_stock">In stock</option>
              <option value="on_sale">On sale</option>
            </Select>
            <Select
              aria-label="Sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className={cn(controlClass, "lg:w-[8rem]")}
            >
              <option value="name">Sort</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="rating">Rating</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow className="bg-white hover:bg-white">
                <TableHeader className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        setSelected(new Set());
                      } else {
                        setSelected(new Set(items.map((p) => p.id)));
                      }
                    }}
                    aria-label="Select all"
                    className="size-4 rounded border-neutral-300"
                  />
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Thumb
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Name / Brand
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Category
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Ratings
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Price details
                </TableHeader>
                {showTodaysDealToggle ? (
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Todays deal
                  </TableHeader>
                ) : null}
                <TableHeader className="w-14 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Options
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={showTodaysDealToggle ? 8 : 7}
                    className="py-16"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 text-neutral-400">
                      <p className="text-sm">{emptyTitle}</p>
                      <Frown className="size-10 opacity-40" aria-hidden />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(product.id)) next.delete(product.id);
                            else next.add(product.id);
                            return next;
                          });
                        }}
                        aria-label={`Select ${product.name}`}
                        className="size-4 rounded border-neutral-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative size-11 overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
                        <Image
                          src={product.imageSrc}
                          alt={product.imageAlt}
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-neutral-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {product.brandName}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">
                      {product.categoryName}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm tabular-nums text-neutral-700">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {product.rating.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium tabular-nums text-neutral-900">
                        {product.priceLabel}
                      </p>
                      {product.compareAtLabel ? (
                        <p className="text-xs tabular-nums text-neutral-400 line-through">
                          {product.compareAtLabel}
                        </p>
                      ) : null}
                    </TableCell>
                    {showTodaysDealToggle ? (
                      <TableCell>
                        <AdminToggleSwitch
                          label={`Today's deal for ${product.name}`}
                          checked={dealOn[product.id] ?? false}
                          onChange={(checked) => {
                            if (pending) {
                              return;
                            }
                            if (!persist.setFlag) {
                              return;
                            }
                            const previous = dealOn[product.id] ?? false;
                            setDealOn((prev) => ({
                              ...prev,
                              [product.id]: checked,
                            }));
                            setFormError(null);
                            startTransition(async () => {
                              const result = await persist.setFlag!(
                                product.id,
                                checked,
                              );
                              if (!result.ok) {
                                setDealOn((prev) => ({
                                  ...prev,
                                  [product.id]: previous,
                                }));
                                setFormError(result.formError);
                                return;
                              }
                              notifySuccess(
                                checked
                                  ? "Marked for today's deal"
                                  : "Removed from today's deal",
                              );
                              router.refresh();
                            });
                          }}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="relative">
                      <button
                        type="button"
                        aria-label={`Options for ${product.name}`}
                        onClick={() =>
                          setMenuId((id) =>
                            id === product.id ? null : product.id,
                          )
                        }
                        className="inline-flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      {menuId === product.id ? (
                        <div className="absolute right-2 z-20 mt-1 min-w-[8rem] rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                          {/* Real navigation to the product — was a
                              "View product (mock)" toast that did nothing. */}
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-50"
                            onClick={() => setMenuId(null)}
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setMenuId(null);
                              if (pending) {
                                return;
                              }
                              setFormError(null);
                              startTransition(async () => {
                                const result = await persist.remove(product.id);
                                if (!result.ok) {
                                  setFormError(result.formError);
                                  notifyError(result.formError);
                                  return;
                                }
                                notifySuccess("Removed from list");
                                router.refresh();
                              });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AdminPromoProductPickerModal
        open={pickerOpen}
        title={pickerTitle}
        products={catalog}
        categories={categories}
        onClose={() => setPickerOpen(false)}
        onAdded={(ids) => {
          setFormError(null);
          startTransition(async () => {
            const result = await persist.assign(ids);
            if (!result.ok) {
              setFormError(result.formError);
              notifyError(result.formError);
              return;
            }
            notifySuccess(`Added ${ids.length} product(s)`);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClassName } from "@/components/ui/button";
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
import { AdminReviewRowActions } from "@/features/admin/reviews/admin-review-row-actions";
import type { AdminReviewListResult } from "@/lib/admin/load-reviews";
import {
  REVIEW_SORT_LABELS,
  REVIEW_TAB_LABELS,
  adminReviewsHref,
  type AdminReviewSort,
  type AdminReviewTab,
} from "@/lib/admin/review-list-params";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const TABS: AdminReviewTab[] = ["all", "custom"];

export function AdminReviewList({
  data,
  canAdd,
  canDelete,
}: {
  data: AdminReviewListResult;
  canAdd: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { items, total, page, pageCount, categories, params } = data;
  const rootCategories = categories.filter((item) => !item.parentSlug);
  const startIndex = (page - 1) * data.pageSize;

  function navigate(next: Partial<typeof params>) {
    router.push(adminReviewsHref({ base: params, ...next, page: 1 }));
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          All rating &amp; reviews
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} product{total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <nav
            aria-label="Review views"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {TABS.map((tab) => {
              const active = params.tab === tab;
              return (
                <Link
                  key={tab}
                  href={adminReviewsHref({ base: params, tab, page: 1 })}
                  className={`-mb-px border-b-2 pb-3 text-body font-medium transition-colors ${
                    active
                      ? "border-[#3897f0] text-[#3897f0]"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {REVIEW_TAB_LABELS[tab]}
                </Link>
              );
            })}
          </nav>
          {canAdd ? (
            <div className="mb-1 flex items-center gap-2">
              <Link
                href="/admin/reviews/new"
                className="text-body font-medium text-[#3897f0] hover:underline"
              >
                Add new custom review
              </Link>
              <Link
                href="/admin/reviews/new"
                aria-label="Add new custom review"
                className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
              >
                <Plus className="size-4" aria-hidden />
              </Link>
            </div>
          ) : null}
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <form
              className="relative min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                navigate({ q: String(form.get("q") ?? "") });
              }}
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                defaultValue={params.q}
                placeholder="Search reviews..."
                className={cn(controlClass, "pl-9")}
              />
            </form>

            <Select
              defaultValue={params.categorySlug ?? ""}
              aria-label="Filter by category"
              className={cn(controlClass, "lg:w-[12rem]")}
              onChange={(event) => {
                navigate({
                  categorySlug: event.target.value || null,
                });
              }}
            >
              <option value="">Filter by category</option>
              {rootCategories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Select
              defaultValue={params.sort}
              aria-label="Sort by rating"
              className={cn(controlClass, "lg:w-[11rem]")}
              onChange={(event) => {
                navigate({
                  sort: event.target.value as AdminReviewSort,
                });
              }}
            >
              {(Object.keys(REVIEW_SORT_LABELS) as AdminReviewSort[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {REVIEW_SORT_LABELS[key]}
                  </option>
                ),
              )}
            </Select>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No reviews match"
              description="Try another tab, category, or search."
              action={
                <Link
                  href="/admin/reviews"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  Reset filters
                </Link>
              }
            />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[56rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="w-12 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    #
                  </TableHeader>
                  <TableHeader className="min-w-[16rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Product
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Brand
                  </TableHeader>
                  <TableHeader className="w-20 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Rating
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Reviews
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Custom reviews
                  </TableHeader>
                  <TableHeader className="w-14">
                    <span className="sr-only">Options</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow
                    key={item.productId}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell className="tabular-nums text-neutral-500">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-md border border-neutral-100 bg-white">
                          <Image
                            src={item.imageSrc}
                            alt=""
                            fill
                            className="object-contain p-1"
                            sizes="44px"
                          />
                        </span>
                        <Link
                          href={`/admin/products/${item.productId}`}
                          className="line-clamp-2 font-medium text-neutral-800 hover:text-[#3897f0]"
                        >
                          {item.productName}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {item.brandName}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-neutral-800">
                      {item.avgRating}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-semibold tabular-nums">
                          {item.reviewCount}
                        </span>
                        {item.hasNew ? (
                          <span className="rounded bg-pink-100 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-pink-600">
                            new
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-neutral-800">
                      {item.customReviewCount}
                    </TableCell>
                    <TableCell>
                      <AdminReviewRowActions
                        productSlug={item.productSlug}
                        productName={item.productName}
                        canAdd={canAdd}
                        canDelete={canDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="border-t border-border px-4 py-4 sm:px-5">
            <Pagination
              page={page}
              pageCount={pageCount}
              hrefForPage={(nextPage) =>
                adminReviewsHref({ base: params, page: nextPage })
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { buttonClassName } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteAdminReviewAction,
  moderateAdminReviewAction,
} from "@/features/admin/reviews/review-actions";
import type { AdminReviewRecord } from "@/lib/catalog/admin-reviews";
import { cn } from "@/lib/cn";

const STATUS_CLASS = {
  pending: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
} as const;

function statusLabel(status: AdminReviewRecord["status"]): string {
  if (status === "published") {
    return "Published";
  }
  if (status === "rejected") {
    return "Rejected";
  }
  return "Pending";
}

export function AdminProductReviews({
  productName,
  productSlug,
  items,
  canAdd,
  canModerate,
  canDelete,
}: {
  productName: string;
  productSlug: string;
  items: AdminReviewRecord[];
  canAdd: boolean;
  canModerate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runModerate(id: string, status: "published" | "rejected") {
    if (!canModerate) {
      notifyError("You do not have permission to moderate reviews.");
      return;
    }
    startTransition(async () => {
      const result = await moderateAdminReviewAction({ id, status });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not update the review.");
        return;
      }
      notifySuccess(
        status === "published" ? "Review published" : "Review rejected",
      );
      router.refresh();
    });
  }

  function runDelete(id: string) {
    if (!canDelete) {
      notifyError("You do not have permission to delete reviews.");
      return;
    }
    if (!window.confirm("Delete this review?")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAdminReviewAction(id);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not delete the review.");
        return;
      }
      notifySuccess("Review deleted");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-10">
      <div>
        <p className="text-caption font-medium text-primary">
          <Link href="/admin/reviews" className="hover:underline">
            Reviews
          </Link>
          <span className="text-text-muted"> / Moderate</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-800">
          {productName}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {items.length} review{items.length === 1 ? "" : "s"}. Pending rows
          stay off the product page until published.
        </p>
        {canAdd ? (
          <p className="mt-2">
            <Link
              href={`/admin/reviews/new?product=${encodeURIComponent(productSlug)}`}
              className="text-sm font-medium text-[#3897f0] hover:underline"
            >
              Add custom review
            </Link>
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-neutral-500">
            No reviews for this product yet.
          </p>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[64rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Reviewer
                  </TableHeader>
                  <TableHeader className="w-20 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Rating
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Comment
                  </TableHeader>
                  <TableHeader className="w-28 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Status
                  </TableHeader>
                  <TableHeader className="w-28 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Date
                  </TableHeader>
                  <TableHeader className="w-48 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Actions
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-neutral-100"
                  >
                    <TableCell>
                      <p className="font-medium text-neutral-900">
                        {item.authorName}
                      </p>
                      {item.isStaffEntry ? (
                        <p className="text-xs text-neutral-500">Staff entry</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {item.rating}
                    </TableCell>
                    <TableCell className="max-w-[22rem]">
                      {item.title ? (
                        <p className="font-medium text-neutral-800">
                          {item.title}
                        </p>
                      ) : null}
                      <p className="line-clamp-3 text-neutral-600">
                        {item.body}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_CLASS[item.status],
                        )}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-neutral-600">
                      {item.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        {canModerate && item.status !== "published" ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => runModerate(item.id, "published")}
                            className={buttonClassName({
                              variant: "secondary",
                              size: "sm",
                            })}
                          >
                            Publish
                          </button>
                        ) : null}
                        {canModerate && item.status !== "rejected" ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => runModerate(item.id, "rejected")}
                            className={buttonClassName({
                              variant: "ghost",
                              size: "sm",
                            })}
                          >
                            Reject
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => runDelete(item.id)}
                            className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

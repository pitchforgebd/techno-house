"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AdminFormLabel } from "@/features/admin/products/admin-product-form-primitives";
import { CampaignStatusBadge } from "@/features/admin/marketing/admin-marketing-badges";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { toggleProductPromotionAction } from "@/features/admin/promotions/promotion-actions";
import type { AssignablePromotionOption } from "@/lib/marketing/promotions";

export function AdminProductPromotionsFields({
  productId,
  promotions,
  assignedPromotionIds,
  canManage,
}: {
  productId: string;
  promotions: AssignablePromotionOption[];
  assignedPromotionIds: string[];
  canManage: boolean;
}) {
  const [assigned, setAssigned] = useState<Set<string>>(
    () => new Set(assignedPromotionIds),
  );
  const [pending, startTransition] = useTransition();

  function toggle(promotionId: string, checked: boolean) {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(promotionId);
      } else {
        next.delete(promotionId);
      }
      return next;
    });
    startTransition(async () => {
      const result = await toggleProductPromotionAction(
        productId,
        promotionId,
        checked,
      );
      if (!result.ok) {
        setAssigned((prev) => {
          const next = new Set(prev);
          if (checked) {
            next.delete(promotionId);
          } else {
            next.add(promotionId);
          }
          return next;
        });
        notifyError(result.formError);
        return;
      }
      notifySuccess(checked ? "Added to offer" : "Removed from offer");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminFormLabel>Promotions</AdminFormLabel>
        <Link
          href="/admin/promotions"
          className="text-xs font-medium text-[#3897f0] hover:underline"
        >
          Manage promotions
        </Link>
      </div>
      <p className="text-xs text-neutral-500">
        Select the offers this product belongs to. Each change saves
        immediately — the product then appears on that offer&apos;s public
        page and gets the &quot;Offer&quot; ribbon on the storefront.
      </p>
      {!canManage ? (
        <p className="rounded-md border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
          You don&apos;t have permission to manage promotions.
        </p>
      ) : null}
      {promotions.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
          No promotions yet. Create one under Admin → Promotions.
        </p>
      ) : (
        <ul className="space-y-2">
          {promotions.map((promotion) => {
            const checked = assigned.has(promotion.id);
            return (
              <li key={promotion.id}>
                <label
                  className={
                    canManage
                      ? "flex cursor-pointer items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2"
                      : "flex cursor-not-allowed items-center gap-3 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2 opacity-70"
                  }
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-[#3897f0]"
                    checked={checked}
                    disabled={!canManage || pending}
                    onChange={(event) =>
                      toggle(promotion.id, event.target.checked)
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">
                    {promotion.name}
                  </span>
                  <CampaignStatusBadge status={promotion.status} />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

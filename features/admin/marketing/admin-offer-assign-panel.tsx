"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { CampaignStatusBadge } from "@/features/admin/marketing/admin-marketing-badges";
import { AdminPromoProductPickerModal } from "@/features/admin/marketing/admin-promo-product-picker-modal";
import type { PromoCatalogProduct } from "@/lib/admin/promotions-offers-mock";
import type { AssignablePromotionOption } from "@/lib/marketing/promotions";

type PersistResult = { ok: true } | { ok: false; formError: string };

export function AdminOfferAssignPanel({
  promotions,
  catalog,
  categories,
  assignToPromotion,
}: {
  promotions: AssignablePromotionOption[];
  catalog: PromoCatalogProduct[];
  categories: { slug: string; name: string }[];
  assignToPromotion: (
    promotionId: string,
    productIds: string[],
  ) => Promise<PersistResult>;
}) {
  const router = useRouter();
  const [promotionId, setPromotionId] = useState(promotions[0]?.id ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activePromotion = promotions.find((item) => item.id === promotionId);

  if (promotions.length === 0) {
    return (
      <EmptyState
        className="rounded-lg border border-border bg-surface"
        title="No promotions yet"
        description="Create an offer campaign first, then come back here to bulk-add products to it."
        action={
          <Link
            href="/admin/promotions/new"
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            Create a promotion
          </Link>
        }
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="space-y-1 border-b border-border px-4 pt-5 pb-4 sm:px-5">
        <h2 className="text-lg font-semibold text-text">
          Add products to an offer
        </h2>
        <p className="text-caption text-text-muted">
          Choose a promotion, then bulk-select the products to add to its
          public offer page.
        </p>
      </div>

      {formError ? (
        <div className="px-4 pt-3 sm:px-5">
          <Alert tone="danger" title="Could not add products">
            <p className="text-caption">{formError}</p>
          </Alert>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-5">
        <label className="block min-w-56 flex-1 space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Promotion
          </span>
          <Select
            value={promotionId}
            onChange={(event) => setPromotionId(event.target.value)}
          >
            {promotions.map((promotion) => (
              <option key={promotion.id} value={promotion.id}>
                {promotion.name} ({promotion.status})
              </option>
            ))}
          </Select>
        </label>

        {activePromotion ? (
          <CampaignStatusBadge status={activePromotion.status} />
        ) : null}

        <Button
          type="button"
          className="gap-1.5"
          disabled={!promotionId || pending}
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="size-4" aria-hidden />
          Select products…
        </Button>

        {activePromotion ? (
          <Link
            href={`/admin/promotions/${activePromotion.id}`}
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            View offer
          </Link>
        ) : null}
      </div>

      <AdminPromoProductPickerModal
        open={pickerOpen}
        title={
          activePromotion
            ? `Add products to "${activePromotion.name}"`
            : "Add products to this offer"
        }
        products={catalog}
        categories={categories}
        onClose={() => setPickerOpen(false)}
        onAdded={(ids) => {
          if (!promotionId) {
            return;
          }
          setFormError(null);
          startTransition(async () => {
            const result = await assignToPromotion(promotionId, ids);
            if (!result.ok) {
              setFormError(result.formError);
              notifyError(result.formError);
              return;
            }
            notifySuccess(`Added ${ids.length} product(s) to the offer`);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

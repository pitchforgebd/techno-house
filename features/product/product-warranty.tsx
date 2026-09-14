import Link from "next/link";
import { AdminWarrantyBadge } from "@/features/admin/warranty/admin-warranty-badge";
import { warrantyBadgeFromLabel } from "@/lib/catalog/warranty-badge";

type ProductWarrantyProps = {
  warrantyLabel: string;
  warrantyBadge?: string | null;
};

export function ProductWarranty({
  warrantyLabel,
  warrantyBadge,
}: ProductWarrantyProps) {
  if (!warrantyLabel.trim()) {
    return null;
  }

  const badge = warrantyBadge?.trim() || warrantyBadgeFromLabel(warrantyLabel);

  return (
    <div
      className="rounded-md border border-border bg-surface px-3 py-3 sm:px-4"
      aria-labelledby="product-warranty-heading"
    >
      <div className="flex flex-wrap items-center gap-3">
        <AdminWarrantyBadge badge={badge} label={warrantyLabel} />
        <div className="min-w-0">
          <h2
            id="product-warranty-heading"
            className="text-label font-semibold tracking-tight text-text"
          >
            Warranty
          </h2>
          <p className="mt-0.5 text-body text-text">{warrantyLabel}</p>
        </div>
      </div>
      <p className="mt-2 text-caption text-text-muted">
        Coverage shown here is a catalog cue for shopping. Final warranty terms
        follow the product and brand policy at purchase.
      </p>
      <p className="mt-2">
        <Link
          href="/warranty"
          className="text-label font-medium text-primary underline-offset-2 hover:underline"
        >
          Read warranty policy
        </Link>
      </p>
    </div>
  );
}

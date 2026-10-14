import Link from "next/link";
import { AdminWarrantyBadge } from "@/features/admin/warranty/admin-warranty-badge";
import { warrantyBadgeFromLabel } from "@/lib/catalog/warranty-badge";

type ProductWarrantyProps = {
  warrantyLabel: string;
  warrantyBadge?: string | null;
  warrantyLogoSrc?: string | null;
};

export function ProductWarranty({
  warrantyLabel,
  warrantyBadge,
  warrantyLogoSrc,
}: ProductWarrantyProps) {
  if (!warrantyLabel.trim()) {
    return null;
  }

  const badge = warrantyBadge?.trim() || warrantyBadgeFromLabel(warrantyLabel);

  return (
    <div
      className="rounded-xl border border-warning/25 bg-gradient-to-r from-warning/5 via-surface to-surface-muted/40 px-4 py-3.5 shadow-sm"
      aria-labelledby="product-warranty-heading"
    >
      <div className="flex items-start gap-3.5">
        <span className="ring-2 ring-warning/30 rounded-full">
          <AdminWarrantyBadge
            badge={badge}
            label={warrantyLabel}
            logoSrc={warrantyLogoSrc}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="product-warranty-heading"
              className="text-label font-bold text-text"
            >
              Official Warranty
            </h2>
            <span className="rounded bg-success/10 px-2 py-0.5 text-[0.65rem] font-semibold text-success">
              {warrantyLabel}
            </span>
          </div>
          <p className="mt-1 text-caption leading-relaxed text-text-muted">
            Genuine brand warranty coverage, supported with authorized repairs.
          </p>
        </div>
      </div>
      <p className="mt-2.5 text-[0.65rem] text-text-muted">
        Coverage shown here is a catalog cue for shopping. Final warranty terms
        follow the product and brand policy at purchase.{" "}
        <Link
          href="/warranty"
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          Read policy
        </Link>
      </p>
    </div>
  );
}

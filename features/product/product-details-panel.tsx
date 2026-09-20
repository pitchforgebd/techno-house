import { AdminWarrantyBadge } from "@/features/admin/warranty/admin-warranty-badge";
import { warrantyBadgeFromLabel } from "@/lib/catalog/warranty-badge";

type ProductDetailsPanelProps = {
  productName: string;
  brandName: string;
  warrantyLabel: string;
  warrantyBadge?: string | null;
  warrantyLogoSrc?: string | null;
  /** Pre-sanitized on the server (page.tsx) — safe to render as-is. */
  detailsHtml: string | null;
};

export function ProductDetailsPanel({
  productName,
  brandName,
  warrantyLabel,
  warrantyBadge,
  warrantyLogoSrc,
  detailsHtml,
}: ProductDetailsPanelProps) {
  const badge =
    warrantyLabel.trim().length > 0
      ? warrantyBadge?.trim() || warrantyBadgeFromLabel(warrantyLabel)
      : null;

  return (
    <div className="space-y-4 border border-border bg-surface px-4 py-4 sm:px-5">
      <dl className="divide-y divide-border border border-border">
        <div className="grid grid-cols-[minmax(8rem,34%)_1fr] gap-3 px-3 py-2.5 sm:px-4">
          <dt className="text-label font-semibold text-text">Brand</dt>
          <dd className="text-body text-text-muted">{brandName}</dd>
        </div>
        <div className="grid grid-cols-[minmax(8rem,34%)_1fr] gap-3 px-3 py-2.5 sm:px-4">
          <dt className="text-label font-semibold text-text">Warranty</dt>
          <dd className="flex flex-wrap items-center gap-2 text-body text-text-muted">
            {badge ? (
              <AdminWarrantyBadge
                badge={badge}
                label={warrantyLabel}
                logoSrc={warrantyLogoSrc}
              />
            ) : null}
            <span>{warrantyLabel || "—"}</span>
          </dd>
        </div>
      </dl>

      {detailsHtml ? (
        <div
          className="th-rich-text text-body text-text"
          dangerouslySetInnerHTML={{ __html: detailsHtml }}
        />
      ) : (
        <p className="text-body text-text-muted">
          No additional details added for {productName} yet.
        </p>
      )}
    </div>
  );
}

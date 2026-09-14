import type { SpecChip } from "@/lib/data";
import { AdminWarrantyBadge } from "@/features/admin/warranty/admin-warranty-badge";
import { warrantyBadgeFromLabel } from "@/lib/catalog/warranty-badge";

type ProductDetailsPanelProps = {
  productName: string;
  brandName: string;
  warrantyLabel: string;
  warrantyBadge?: string | null;
  overview: string[];
  specs: SpecChip[];
};

export function ProductDetailsPanel({
  productName,
  brandName,
  warrantyLabel,
  warrantyBadge,
  overview,
  specs,
}: ProductDetailsPanelProps) {
  const chips = specs.slice(0, 8);
  const badge =
    warrantyLabel.trim().length > 0
      ? warrantyBadge?.trim() || warrantyBadgeFromLabel(warrantyLabel)
      : null;

  return (
    <div className="space-y-4 border border-border bg-surface px-4 py-4 sm:px-5">
      <p className="text-body text-text-muted">
        Product details for {productName}. Catalog copy is for shopping guidance
        only.
      </p>
      <dl className="divide-y divide-border border border-border">
        <div className="grid grid-cols-[minmax(8rem,34%)_1fr] gap-3 px-3 py-2.5 sm:px-4">
          <dt className="text-label font-semibold text-text">Brand</dt>
          <dd className="text-body text-text-muted">{brandName}</dd>
        </div>
        <div className="grid grid-cols-[minmax(8rem,34%)_1fr] gap-3 px-3 py-2.5 sm:px-4">
          <dt className="text-label font-semibold text-text">Warranty</dt>
          <dd className="flex flex-wrap items-center gap-2 text-body text-text-muted">
            {badge ? (
              <AdminWarrantyBadge badge={badge} label={warrantyLabel} />
            ) : null}
            <span>{warrantyLabel || "—"}</span>
          </dd>
        </div>
      </dl>
      {overview.length > 0 ? (
        <div>
          <h3 className="text-label font-semibold text-text">Overview</h3>
          <ul className="mt-2 space-y-1.5 text-body text-text-muted">
            {overview.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-primary">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div>
          <h3 className="text-label font-semibold text-text">Highlights</h3>
          <ul className="mt-2 space-y-1.5 text-body text-text-muted">
            {chips.map((spec) => (
              <li key={`${spec.label}-${spec.value}`}>
                <span className="font-medium text-text">{spec.label}</span>:{" "}
                {spec.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { PcBuilderAddToCart } from "@/features/pc-builder/pc-builder-add-to-cart";
import { PcBuilderBuildActions } from "@/features/pc-builder/pc-builder-build-actions";
import { PcBuilderCompatibility } from "@/features/pc-builder/pc-builder-compatibility";
import {
  PcBuilderPricing,
  PcBuilderTotal,
} from "@/features/pc-builder/pc-builder-pricing";
import { PcBuilderSaveShare } from "@/features/pc-builder/pc-builder-save-share";
import type { ProductSummary } from "@/lib/data";
import {
  countFilledSlots,
  sharePathForSelection,
  type BuilderSlotMeta,
  type BuildPowerSummary,
  type BuildPricingSummary,
  type BuildSelection,
  type BuildStockSummary,
  type BuildValidationIssue,
  type CompatibilityResult,
} from "@/lib/domain/pc-builder";

export function PcBuilderSummary({
  selection,
  products,
  productsPending,
  compatibility,
  pricing,
  stock,
  power,
  issues,
  loadError,
  onClearBuild,
  onLoadSelection,
  slots,
}: {
  selection: BuildSelection;
  products: ProductSummary[];
  productsPending: boolean;
  compatibility: CompatibilityResult | null;
  pricing: BuildPricingSummary;
  stock: BuildStockSummary;
  power: BuildPowerSummary;
  issues: BuildValidationIssue[];
  loadError: string | null;
  onClearBuild: () => void;
  onLoadSelection: (selection: BuildSelection) => void;
  slots: readonly BuilderSlotMeta[];
}) {
  const counts = countFilledSlots(selection, slots);
  // Encodes the parts into the URL itself, so Download/Print/Share work for
  // a guest without saving the build first.
  const sharePath = useMemo(
    () => sharePathForSelection(selection),
    [selection],
  );

  return (
    <aside
      className="h-fit space-y-4 rounded-md border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-4"
      aria-labelledby="pc-builder-summary-heading"
    >
      <h2
        id="pc-builder-summary-heading"
        className="text-label font-semibold text-text"
      >
        Build summary
      </h2>

      <PcBuilderTotal pricing={pricing} />

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border px-3 py-2">
          <dt className="text-caption text-text-muted">Parts</dt>
          <dd className="tabular-nums text-label font-semibold text-text">
            {counts.filled} / {counts.total}
          </dd>
        </div>
        <div className="rounded-md border border-border px-3 py-2">
          <dt className="text-caption text-text-muted">Required</dt>
          <dd className="tabular-nums text-label font-semibold text-text">
            {counts.requiredFilled} / {counts.requiredTotal}
          </dd>
        </div>
      </dl>

      <div className="divide-y divide-border rounded-md border border-border">
        <PcBuilderPricing
          filledCount={counts.filled}
          stock={stock}
          power={power}
        />
        <PcBuilderCompatibility
          result={compatibility}
          filledCount={counts.filled}
        />
      </div>

      {issues.length > 0 ? (
        <ul className="space-y-2">
          {issues.map((issue) => (
            <li key={`${issue.code}-${issue.slotId}`}>
              <Alert tone="warning" title="Build check">
                <p className="text-caption">{issue.message}</p>
              </Alert>
            </li>
          ))}
        </ul>
      ) : null}

      {loadError ? (
        <Alert tone="warning" title="Refresh issue">
          <p className="text-caption">{loadError}</p>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <PcBuilderAddToCart
          selection={selection}
          products={products}
          productsPending={productsPending}
          compatibility={compatibility}
          issues={issues}
          slots={slots}
        />
        <PcBuilderBuildActions
          sharePath={sharePath}
          buildName="My PC build"
        />
        <PcBuilderSaveShare
          selection={selection}
          onLoadSelection={onLoadSelection}
        />
        <button
          type="button"
          disabled={counts.filled === 0}
          className={buttonClassName({
            variant: "ghost",
            className: "w-full border border-border",
          })}
          onClick={onClearBuild}
        >
          Clear all parts
        </button>
      </div>

      <p className="text-caption text-text-muted">
        Stock, compatibility, and prices are re-checked on the server when you
        add the build to cart.
      </p>
    </aside>
  );
}

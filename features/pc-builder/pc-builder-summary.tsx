"use client";

import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { PcBuilderAddToCart } from "@/features/pc-builder/pc-builder-add-to-cart";
import { PcBuilderCompatibility } from "@/features/pc-builder/pc-builder-compatibility";
import { PcBuilderPricing } from "@/features/pc-builder/pc-builder-pricing";
import { PcBuilderSaveShare } from "@/features/pc-builder/pc-builder-save-share";
import type { ProductSummary } from "@/lib/data";
import {
  countFilledSlots,
  type BuildPowerSummary,
  type BuildPricingSummary,
  type BuildSelection,
  type BuildStockSummary,
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
  loadError,
  onClearBuild,
  onLoadSelection,
}: {
  selection: BuildSelection;
  products: ProductSummary[];
  productsPending: boolean;
  compatibility: CompatibilityResult | null;
  pricing: BuildPricingSummary;
  stock: BuildStockSummary;
  power: BuildPowerSummary;
  loadError: string | null;
  onClearBuild: () => void;
  onLoadSelection: (selection: BuildSelection) => void;
}) {
  const counts = countFilledSlots(selection);

  return (
    <aside
      className="h-fit space-y-4 rounded-md border border-border bg-surface p-4 lg:sticky lg:top-4"
      aria-labelledby="pc-builder-summary-heading"
    >
      <div>
        <h2
          id="pc-builder-summary-heading"
          className="text-label font-semibold text-text"
        >
          Build summary
        </h2>
        <p className="mt-1 text-caption text-text-muted">
          Display-only estimates. Final totals are validated server-side later.
        </p>
      </div>

      <dl className="space-y-2 text-body">
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">Parts selected</dt>
          <dd className="tabular-nums font-medium text-text">
            {counts.filled} / {counts.total}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">Required slots</dt>
          <dd className="tabular-nums text-text">
            {counts.requiredFilled} / {counts.requiredTotal}
          </dd>
        </div>
      </dl>

      <PcBuilderPricing
        filledCount={counts.filled}
        pricing={pricing}
        stock={stock}
        power={power}
      />

      <PcBuilderCompatibility
        result={compatibility}
        filledCount={counts.filled}
      />

      <Alert tone="info" title="Display cart only">
        <p className="text-caption">
          Adding a build updates the local cart preview. Server price and
          compatibility checks arrive with PC Builder backend.
        </p>
      </Alert>

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
    </aside>
  );
}

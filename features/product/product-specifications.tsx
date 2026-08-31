"use client";

import { useState } from "react";
import type { SpecGroup } from "@/lib/data";
import { cn } from "@/lib/cn";

const INITIAL_VISIBLE_ROWS = 8;

type ProductSpecificationsProps = {
  groups: SpecGroup[];
  productName: string;
};

export function ProductSpecifications({
  groups,
  productName,
}: ProductSpecificationsProps) {
  const [expanded, setExpanded] = useState(false);

  const rows = groups.flatMap((group) => group.rows);

  if (rows.length === 0) {
    return (
      <p className="border border-border bg-surface px-4 py-6 text-body text-text-muted">
        Specifications for {productName} are not listed yet.
      </p>
    );
  }

  const hiddenCount = Math.max(0, rows.length - INITIAL_VISIBLE_ROWS);
  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_VISIBLE_ROWS);

  return (
    <div className="space-y-4">
      <div className="border border-border bg-surface">
        <dl className="divide-y divide-border">
          {visibleRows.map((row) => (
            <div
              key={`${row.key}-${row.value}`}
              className="grid grid-cols-[minmax(8rem,34%)_1fr] gap-3 px-3 py-2.5 sm:px-4"
            >
              <dt className="text-label font-semibold text-text">{row.key}</dt>
              <dd className="text-body text-text-muted">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {hiddenCount > 0 ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={cn(
              "min-h-10 bg-text px-5 text-label font-medium text-primary-foreground transition-colors hover:bg-text/90",
            )}
          >
            {expanded
              ? "Show less"
              : `Show additional information (${hiddenCount} more)`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

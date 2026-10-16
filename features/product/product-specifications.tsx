"use client";

import { useState } from "react";
import type { SpecGroup } from "@/lib/data";
import { cn } from "@/lib/cn";

const INITIAL_VISIBLE_ROWS = 10;

type ProductSpecificationsProps = {
  groups: SpecGroup[];
  productName: string;
};

/** Total rows across every group — what "N more" counts against. */
function totalRowCount(groups: SpecGroup[]): number {
  return groups.reduce((sum, group) => sum + group.rows.length, 0);
}

/** Groups truncated to the first `limit` rows overall, group order preserved,
 * empty groups (including ones emptied entirely by the cap) dropped. */
function truncatedGroups(groups: SpecGroup[], limit: number): SpecGroup[] {
  const out: SpecGroup[] = [];
  let remaining = limit;
  for (const group of groups) {
    if (remaining <= 0) {
      break;
    }
    if (group.rows.length === 0) {
      continue;
    }
    out.push({ ...group, rows: group.rows.slice(0, remaining) });
    remaining -= group.rows.length;
  }
  return out;
}

type FlatRow = {
  key: string;
  value: string;
  /** Set only on a group's first row — renders that group's header band. */
  groupTitle: string | null;
};

/** Groups flattened into one row list the table body can `.map()` by plain
 * index — a running mutable counter inside a JSX `.map()` callback trips the
 * react-hooks "no reassignment during render" rule. */
function flattenForDisplay(groups: SpecGroup[]): FlatRow[] {
  return groups.flatMap((group) =>
    group.rows.map((row, index) => ({
      key: row.key,
      value: row.value,
      groupTitle: index === 0 ? group.title : null,
    })),
  );
}

export function ProductSpecifications({
  groups,
  productName,
}: ProductSpecificationsProps) {
  const [expanded, setExpanded] = useState(false);
  const nonEmptyGroups = groups.filter((group) => group.rows.length > 0);

  if (nonEmptyGroups.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-text">Specification</h2>
        <p className="border border-border bg-surface px-4 py-6 text-body text-text-muted">
          Specifications for {productName} are not listed yet.
        </p>
      </div>
    );
  }

  const totalRows = totalRowCount(nonEmptyGroups);
  const hiddenCount = Math.max(0, totalRows - INITIAL_VISIBLE_ROWS);
  const displayGroups = expanded
    ? nonEmptyGroups
    : truncatedGroups(nonEmptyGroups, INITIAL_VISIBLE_ROWS);
  // One flat list, not nested per-group maps, so the zebra stripe (by plain
  // array index) reads as one continuous table rather than restarting at
  // each group's own first row.
  const flatRows = flattenForDisplay(displayGroups);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text">Specification</h2>
      <div className="overflow-hidden rounded-sm border border-border bg-surface">
        {flatRows.map((row, index) => (
          <div key={`${row.groupTitle ?? "cont"}-${index}-${row.key}`}>
            {row.groupTitle ? (
              <div className="bg-primary-soft px-4 py-2.5 text-label font-bold text-primary sm:px-5">
                {row.groupTitle}
              </div>
            ) : null}
            <div
              className={cn(
                "flex flex-col gap-1 border-t border-border px-4 py-2.5 sm:flex-row sm:gap-6 sm:px-5",
                index % 2 === 1 && "bg-surface-muted/50",
              )}
            >
              <span className="shrink-0 text-label text-text-muted sm:w-1/4">
                {row.key}
              </span>
              <span className="text-body text-text">{row.value}</span>
            </div>
          </div>
        ))}
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

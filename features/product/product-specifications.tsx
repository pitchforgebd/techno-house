"use client";

import { useState } from "react";
import type { SpecGroup } from "@/lib/data";
import { cn } from "@/lib/cn";

const INITIAL_VISIBLE_ROWS = 10;

type ProductSpecificationsProps = {
  groups: SpecGroup[];
  productName: string;
};

type FlatSpecRow = {
  groupTitle: string;
  groupRowSpan: number;
  isGroupStart: boolean;
  key: string;
  value: string;
  rowKey: string;
};

function flattenGroupedRows(groups: SpecGroup[]): FlatSpecRow[] {
  const out: FlatSpecRow[] = [];
  for (const group of groups) {
    if (group.rows.length === 0) {
      continue;
    }
    group.rows.forEach((row, index) => {
      out.push({
        groupTitle: group.title,
        groupRowSpan: group.rows.length,
        isGroupStart: index === 0,
        key: row.key,
        value: row.value,
        rowKey: `${group.title}-${index}-${row.key}`,
      });
    });
  }
  return out;
}

export function ProductSpecifications({
  groups,
  productName,
}: ProductSpecificationsProps) {
  const [expanded, setExpanded] = useState(false);
  const allRows = flattenGroupedRows(groups);

  if (allRows.length === 0) {
    return (
      <p className="border border-border bg-surface px-4 py-6 text-body text-text-muted">
        Specifications for {productName} are not listed yet.
      </p>
    );
  }

  const hiddenCount = Math.max(0, allRows.length - INITIAL_VISIBLE_ROWS);
  const visibleRows = expanded
    ? allRows
    : allRows.slice(0, INITIAL_VISIBLE_ROWS);

  // When collapsed mid-group, fix rowspan so the table stays valid.
  const displayRows = visibleRows.map((row, index) => {
    if (!row.isGroupStart) {
      return { ...row, showGroupCell: false, span: 1 };
    }
    let span = 1;
    for (let i = index + 1; i < visibleRows.length; i += 1) {
      const next = visibleRows[i];
      if (!next || next.groupTitle !== row.groupTitle || next.isGroupStart) {
        break;
      }
      span += 1;
    }
    return { ...row, showGroupCell: true, span };
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border bg-surface">
        <table className="w-full min-w-[20rem] border-collapse text-left">
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.rowKey} className="border-b border-border last:border-b-0">
                {row.showGroupCell ? (
                  <th
                    scope="rowgroup"
                    rowSpan={row.span}
                    className="w-[22%] min-w-[5.5rem] border-r border-border bg-surface-muted/70 px-3 py-2.5 align-top text-label font-semibold text-text sm:px-4"
                  >
                    {row.groupTitle}
                  </th>
                ) : null}
                <th
                  scope="row"
                  className="w-[28%] min-w-[7rem] border-r border-border px-3 py-2.5 align-top text-label font-semibold text-text sm:px-4"
                >
                  {row.key}
                </th>
                <td className="px-3 py-2.5 align-top text-body text-text-muted sm:px-4">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminFormDashedButton,
  AdminFormInlineLink,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import type { SpecGroup } from "@/lib/data";

export type SpecGroupFormRow = {
  id: string;
  key: string;
  value: string;
};

export type SpecGroupFormSection = {
  id: string;
  title: string;
  rows: SpecGroupFormRow[];
};

function emptyRow(groupId: string, index: number): SpecGroupFormRow {
  return {
    id: `${groupId}-row-new-${index}`,
    key: "",
    value: "",
  };
}

export function createEmptySpecGroup(
  index: number,
): SpecGroupFormSection {
  const id = `spec-group-new-${index}`;
  return {
    id,
    title: "",
    rows: [emptyRow(id, 0)],
  };
}

/** Stable ids from stored data — safe for SSR hydration. */
export function specGroupsFromProduct(
  groups: SpecGroup[] | undefined,
): SpecGroupFormSection[] {
  if (!groups || groups.length === 0) {
    return [];
  }
  return groups.map((group, groupIndex) => {
    const id = `spec-group-${groupIndex}-${group.title}`;
    return {
      id,
      title: group.title,
      rows: group.rows.map((row, rowIndex) => ({
        id: `spec-row-${groupIndex}-${rowIndex}-${row.key}`,
        key: row.key,
        value: row.value,
      })),
    };
  });
}

export function AdminProductSpecGroupsFields({
  groups,
  onChange,
}: {
  groups: SpecGroupFormSection[];
  onChange: (groups: SpecGroupFormSection[]) => void;
}) {
  function updateGroup(
    groupId: string,
    patch: Partial<Pick<SpecGroupFormSection, "title" | "rows">>,
  ) {
    onChange(
      groups.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group,
      ),
    );
  }

  function updateRow(
    groupId: string,
    rowId: string,
    patch: Partial<Pick<SpecGroupFormRow, "key" | "value">>,
  ) {
    onChange(
      groups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }
        return {
          ...group,
          rows: group.rows.map((row) =>
            row.id === rowId ? { ...row, ...patch } : row,
          ),
        };
      }),
    );
  }

  function addGroup() {
    onChange([...groups, createEmptySpecGroup(groups.length)]);
  }

  function removeGroup(groupId: string) {
    onChange(groups.filter((group) => group.id !== groupId));
  }

  function addRow(groupId: string) {
    onChange(
      groups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }
        return {
          ...group,
          rows: [...group.rows, emptyRow(groupId, group.rows.length)],
        };
      }),
    );
  }

  function removeRow(groupId: string, rowId: string) {
    onChange(
      groups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }
        const nextRows = group.rows.filter((row) => row.id !== rowId);
        return {
          ...group,
          rows: nextRows.length > 0 ? nextRows : [emptyRow(groupId, 0)],
        };
      }),
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        Build the specification table shoppers see on the product page.
        Use sections like General, Network, Display — each with label / value
        rows (same layout as a phone spec sheet).
      </p>

      {groups.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
          No specification sections yet. Add a section to start.
        </p>
      ) : null}

      {groups.map((group, groupIndex) => (
        <div
          key={group.id}
          className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50/60 p-3"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1 space-y-1.5">
              <AdminFormLabel htmlFor={`${group.id}-title`}>
                Section {groupIndex + 1} title
              </AdminFormLabel>
              <Input
                id={`${group.id}-title`}
                className={adminFormControlClass}
                value={group.title}
                placeholder="e.g. General, Network, Display"
                onChange={(event) =>
                  updateGroup(group.id, { title: event.target.value })
                }
              />
            </div>
            <button
              type="button"
              className="h-9 text-sm text-danger hover:underline"
              onClick={() => removeGroup(group.id)}
            >
              Remove section
            </button>
          </div>

          <div className="space-y-2">
            {group.rows.map((row, rowIndex) => (
              <div
                key={row.id}
                className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-start"
              >
                <div className="space-y-1">
                  {rowIndex === 0 ? (
                    <AdminFormLabel htmlFor={`${row.id}-key`}>
                      Label
                    </AdminFormLabel>
                  ) : (
                    <span className="sr-only">Label</span>
                  )}
                  <Input
                    id={`${row.id}-key`}
                    className={adminFormControlClass}
                    value={row.key}
                    placeholder="Brand"
                    onChange={(event) =>
                      updateRow(group.id, row.id, { key: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  {rowIndex === 0 ? (
                    <AdminFormLabel htmlFor={`${row.id}-value`}>
                      Value
                    </AdminFormLabel>
                  ) : (
                    <span className="sr-only">Value</span>
                  )}
                  <Textarea
                    id={`${row.id}-value`}
                    rows={row.value.length > 80 ? 3 : 1}
                    className="min-h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
                    value={row.value}
                    placeholder="Nokia"
                    onChange={(event) =>
                      updateRow(group.id, row.id, {
                        value: event.target.value,
                      })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="h-9 px-1 text-sm text-danger hover:underline sm:mt-6"
                  onClick={() => removeRow(group.id, row.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <AdminFormInlineLink onClick={() => addRow(group.id)}>
            + Add row
          </AdminFormInlineLink>
        </div>
      ))}

      <AdminFormDashedButton onClick={addGroup}>
        + Add specification section
      </AdminFormDashedButton>
    </div>
  );
}

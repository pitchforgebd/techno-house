"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AdminFormInlineLink,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import type { ProductFormAttributeOption } from "@/lib/admin/load-products";

export type ProductAttributeFormRow = {
  /** Client-only React key — not persisted. */
  id: string;
  key: string;
  value: string;
};

function isColorAttribute(attribute: ProductFormAttributeOption): boolean {
  const key = attribute.key.toLowerCase();
  const name = attribute.name.toLowerCase();
  return (
    key === "color" ||
    key === "colors" ||
    name === "color" ||
    name === "colors"
  );
}

function newRowId(): string {
  // Only used after user interaction (add row / set color). Never call during
  // the initial SSR/client render — that causes hydration mismatches.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `attr-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyAttributeRow(): ProductAttributeFormRow {
  return { id: newRowId(), key: "", value: "" };
}

/** Stable ids so SSR and hydration match (no randomUUID on first paint). */
export function attributeRowsFromProduct(
  attributes: Record<string, string> | undefined,
): ProductAttributeFormRow[] {
  const entries = Object.entries(attributes ?? {});
  if (entries.length === 0) {
    return [];
  }
  return entries.map(([key, value]) => ({
    id: `product-attr-${key}`,
    key,
    value,
  }));
}

export function AdminProductAttributesFields({
  attributes,
  rows,
  onRowsChange,
}: {
  attributes: ProductFormAttributeOption[];
  rows: ProductAttributeFormRow[];
  onRowsChange: (rows: ProductAttributeFormRow[]) => void;
}) {
  const colorAttribute = attributes.find(isColorAttribute) ?? null;
  const catalogAttributes = attributes.filter(
    (attribute) => !isColorAttribute(attribute),
  );
  const byKey = new Map(
    attributes.map((attribute) => [attribute.key, attribute]),
  );

  // Colour options are managed in the dedicated Colours editor — hide the
  // legacy Colors attribute control so staff do not maintain two places.
  const editableRows = rows.filter(
    (row) => !colorAttribute || row.key !== colorAttribute.key,
  );

  const usedCatalogKeys = new Set(
    editableRows.map((row) => row.key).filter(Boolean),
  );
  const canAddMore = catalogAttributes.some(
    (attribute) => !usedCatalogKeys.has(attribute.key),
  );

  function usedKeysExcept(rowId: string): Set<string> {
    return new Set(
      editableRows
        .filter((row) => row.id !== rowId && row.key)
        .map((row) => row.key),
    );
  }

  function updateRow(
    rowId: string,
    patch: Partial<Pick<ProductAttributeFormRow, "key" | "value">>,
  ) {
    onRowsChange(
      rows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        const nextKey = patch.key !== undefined ? patch.key : row.key;
        let nextValue = patch.value !== undefined ? patch.value : row.value;
        if (patch.key !== undefined && patch.key !== row.key) {
          const def = byKey.get(patch.key);
          nextValue = def?.values[0] ?? "";
        }
        return { ...row, key: nextKey, value: nextValue };
      }),
    );
  }

  function removeRow(rowId: string) {
    onRowsChange(rows.filter((row) => row.id !== rowId));
  }

  function addRow() {
    if (!canAddMore) {
      return;
    }
    onRowsChange([...rows, createEmptyAttributeRow()]);
  }

  if (attributes.length === 0) {
    return (
      <div className="space-y-3 rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        <p>No attributes are defined yet, so nothing can be selected here.</p>
        <Link
          href="/admin/attributes"
          className="font-medium text-[#3897f0] hover:underline"
        >
          Create attributes in Attributes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-600">
          Attributes
        </span>
      </div>

      {editableRows.length > 0 ? (
        <div className="space-y-3 rounded-md border border-neutral-200 bg-white p-3">
          {editableRows.map((row, index) => {
            const used = usedKeysExcept(row.id);
            const optionsForRow = catalogAttributes.filter(
              (attribute) =>
                attribute.key === row.key || !used.has(attribute.key),
            );
            const def = row.key ? byKey.get(row.key) : undefined;
            const hasPresetValues = Boolean(def && def.values.length > 0);
            const attrId = `attr-key-${row.id}`;
            const valueId = `attr-value-${row.id}`;

            return (
              <div
                key={row.id}
                className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end"
              >
                <div className="space-y-1.5">
                  {index === 0 ? (
                    <AdminFormLabel htmlFor={attrId}>Attribute</AdminFormLabel>
                  ) : (
                    <span className="sr-only">Attribute</span>
                  )}
                  <Select
                    id={attrId}
                    className={adminFormControlClass}
                    value={row.key}
                    onChange={(event) =>
                      updateRow(row.id, { key: event.target.value })
                    }
                  >
                    <option value="">Select attribute</option>
                    {optionsForRow.map((attribute) => (
                      <option key={attribute.id} value={attribute.key}>
                        {attribute.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  {index === 0 ? (
                    <AdminFormLabel htmlFor={valueId}>Value</AdminFormLabel>
                  ) : (
                    <span className="sr-only">Value</span>
                  )}
                  {!row.key ? (
                    <Select
                      id={valueId}
                      className={adminFormControlClass}
                      value=""
                      disabled
                    >
                      <option value="">Select attribute first</option>
                    </Select>
                  ) : hasPresetValues && def ? (
                    <Select
                      id={valueId}
                      className={adminFormControlClass}
                      value={row.value}
                      onChange={(event) =>
                        updateRow(row.id, { value: event.target.value })
                      }
                    >
                      <option value="">Nothing selected</option>
                      {def.values.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={valueId}
                      className={adminFormControlClass}
                      value={row.value}
                      onChange={(event) =>
                        updateRow(row.id, { value: event.target.value })
                      }
                      placeholder="Enter value"
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="h-9 px-2 text-sm text-danger hover:underline"
                  onClick={() => removeRow(row.id)}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {canAddMore ? (
        <AdminFormInlineLink onClick={addRow}>
          + New attribute
        </AdminFormInlineLink>
      ) : (
        <p className="text-caption text-neutral-500">
          All catalogue attributes are on this product. Add more definitions
          under{" "}
          <Link
            href="/admin/attributes"
            className="font-medium text-[#3897f0] hover:underline"
          >
            Attributes
          </Link>
          .
        </p>
      )}
    </div>
  );
}

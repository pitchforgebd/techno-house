"use client";

import { Input } from "@/components/ui/input";
import {
  AdminFormDashedButton,
  AdminFormLabel,
  AdminFormUploadBox,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { PRODUCT_COLOR_IMAGE_MAX } from "@/lib/catalog/color-input";
import type { ProductColorOption } from "@/lib/data/types/catalog";

export type ProductColorFormRow = {
  id: string;
  name: string;
  hex: string;
  imageSrcs: string[];
};

export function colorRowsFromProduct(
  colors: ProductColorOption[] | undefined,
): ProductColorFormRow[] {
  if (!colors || colors.length === 0) {
    return [];
  }
  return colors.map((color, index) => ({
    id: `product-color-${color.id || index}`,
    name: color.name,
    hex: color.hex ?? "",
    imageSrcs:
      color.images.length > 0 ? color.images.map((image) => image.src) : [""],
  }));
}

export function createEmptyColorRow(index: number): ProductColorFormRow {
  return {
    id: `product-color-new-${index}`,
    name: "",
    hex: "",
    imageSrcs: [""],
  };
}

export function AdminProductColorsFields({
  rows,
  onChange,
}: {
  rows: ProductColorFormRow[];
  onChange: (rows: ProductColorFormRow[]) => void;
}) {
  function updateRow(
    id: string,
    patch: Partial<Pick<ProductColorFormRow, "name" | "hex" | "imageSrcs">>,
  ) {
    onChange(
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">
        Add colours customers can pick on the product page. Optional images
        swap the gallery when that colour is selected. Without colour images,
        the product thumbnail/gallery is used.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
          No colours yet. Add colours if this product has colour options.
        </p>
      ) : null}

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="space-y-3 rounded-md border border-neutral-200 bg-white p-3"
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto] sm:items-end">
            <div className="space-y-1.5">
              {index === 0 ? (
                <AdminFormLabel htmlFor={`${row.id}-name`}>
                  Color name
                </AdminFormLabel>
              ) : (
                <span className="sr-only">Color name</span>
              )}
              <Input
                id={`${row.id}-name`}
                className={adminFormControlClass}
                value={row.name}
                placeholder="Space Grey"
                onChange={(event) =>
                  updateRow(row.id, { name: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              {index === 0 ? (
                <AdminFormLabel htmlFor={`${row.id}-hex`}>Hex</AdminFormLabel>
              ) : (
                <span className="sr-only">Hex</span>
              )}
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label={`${row.name || "Colour"} picker`}
                  className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-white p-1"
                  value={
                    /^#([0-9a-fA-F]{6})$/.test(row.hex)
                      ? row.hex
                      : /^#([0-9a-fA-F]{3})$/.test(row.hex)
                        ? `#${row.hex[1]}${row.hex[1]}${row.hex[2]}${row.hex[2]}${row.hex[3]}${row.hex[3]}`
                        : "#808080"
                  }
                  onChange={(event) =>
                    updateRow(row.id, { hex: event.target.value })
                  }
                />
                <Input
                  id={`${row.id}-hex`}
                  className={adminFormControlClass}
                  value={row.hex}
                  placeholder="#1a1a1a"
                  onChange={(event) =>
                    updateRow(row.id, { hex: event.target.value })
                  }
                />
              </div>
            </div>
            <button
              type="button"
              className="h-9 text-sm text-danger hover:underline"
              onClick={() =>
                onChange(rows.filter((item) => item.id !== row.id))
              }
            >
              Remove
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-600">
              Colour images (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {row.imageSrcs.map((src, imageIndex) => (
                <div key={`${row.id}-img-${imageIndex}`} className="relative">
                  <AdminFormUploadBox
                    label={`Image ${imageIndex + 1}`}
                    sizeHint="Optional — 800px × 800px, same as gallery images"
                    previewSrc={src || null}
                    previewAlt={row.name || "Colour"}
                    value={src}
                    onChange={(path) => {
                      const next = [...row.imageSrcs];
                      next[imageIndex] = path;
                      updateRow(row.id, { imageSrcs: next });
                    }}
                    folder="products"
                  />
                  {row.imageSrcs.length > 1 ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-danger hover:underline"
                      onClick={() => {
                        const next = row.imageSrcs.filter(
                          (_, i) => i !== imageIndex,
                        );
                        updateRow(row.id, {
                          imageSrcs: next.length > 0 ? next : [""],
                        });
                      }}
                    >
                      Remove image
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {row.imageSrcs.length < PRODUCT_COLOR_IMAGE_MAX ? (
              <AdminFormDashedButton
                onClick={() =>
                  updateRow(row.id, {
                    imageSrcs: [...row.imageSrcs, ""],
                  })
                }
              >
                + Add colour image
              </AdminFormDashedButton>
            ) : null}
          </div>
        </div>
      ))}

      <AdminFormDashedButton
        onClick={() => onChange([...rows, createEmptyColorRow(rows.length)])}
      >
        + Add colour
      </AdminFormDashedButton>
    </div>
  );
}

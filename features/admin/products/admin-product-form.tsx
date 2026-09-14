"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  AlignLeft,
  Bold,
  Eraser,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Palette,
  Redo2,
  Table,
  Underline,
  Undo2,
  Video,
  Wand2,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  cloneAdminProductAction,
  saveAdminProductAction,
} from "@/features/admin/products/product-actions";
import {
  AdminQuickCreateBrandModal,
  AdminQuickCreateCategoryModal,
} from "@/features/admin/products/admin-quick-create-category-brand";
import {
  BUILDER_ATTR_MAX,
  PRODUCT_BARCODE_MAX,
  slugifyProduct,
  type ProductVariantInputFields,
} from "@/lib/catalog/product-input";
import { BUILDER_SLOTS } from "@/lib/domain/pc-builder";
import {
  FORM_FACTOR_OPTIONS,
  OTHER_OPTION_VALUE,
  RAM_TYPE_OPTIONS,
  SOCKET_OPTIONS,
  STORAGE_INTERFACE_OPTIONS,
} from "@/lib/domain/pc-builder/attribute-options";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  deriveStockStatus,
} from "@/lib/catalog/inventory-input";
import {
  AdminFormCard,
  AdminFormDivider,
  AdminFormDashedButton,
  AdminFormInlineLink,
  AdminFormLabel,
  AdminFormUploadBox,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import {
  AdminProductAttributesFields,
  attributeRowsFromProduct,
  type ProductAttributeFormRow,
} from "@/features/admin/products/admin-product-attributes-fields";
import {
  AdminProductColorsFields,
  colorRowsFromProduct,
  type ProductColorFormRow,
} from "@/features/admin/products/admin-product-colors-fields";
import {
  AdminProductLabelsFields,
  AdminProductNotesFields,
} from "@/features/admin/products/admin-product-notes-labels-fields";
import { AdminProductPdfField } from "@/features/admin/products/admin-product-pdf-field";
import {
  AdminProductSpecGroupsFields,
  specGroupsFromProduct,
  type SpecGroupFormSection,
} from "@/features/admin/products/admin-product-spec-groups-fields";
import { AdminProductFormSidebar } from "@/features/admin/products/admin-product-form-sidebar";
import type { ProductFormAttributeOption } from "@/lib/admin/load-products";
import type { Category, ProductDetail, StockStatus } from "@/lib/data";
import {
  formatDiscountDateInput,
} from "@/lib/catalog/discount-pricing";
import {
  matchWarrantyOptionId,
  type ProductWarrantyOption,
} from "@/lib/catalog/warranty-badge";
import type {
  ProductLabelOption,
  ProductNoteOption,
} from "@/lib/catalog/product-notes-labels";
import { cn } from "@/lib/cn";

type FormMode = "create" | "edit";
type BrandOption = { slug: string; name: string };
type EditorProduct = ProductDetail & {
  isActive: boolean;
  position: number;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    priceAmount: number;
    compareAtAmount: number | null;
    isActive: boolean;
    quantity: number;
  }>;
  barcode: string;
  relatedProducts: { id: string; slug: string; name: string }[];
};

function emptyVariant(): ProductVariantInputFields {
  return {
    name: "",
    sku: "",
    price: "",
    compareAt: "",
    isActive: true,
    quantity: "",
  };
}

function stockQtyFromStatus(status: StockStatus | undefined): string {
  if (status === "out_of_stock") {
    return "0";
  }
  if (status === "low_stock") {
    return "5";
  }
  return "25";
}

function slugify(value: string): string {
  return slugifyProduct(value);
}

/**
 * Controlled-vocabulary dropdown with an "Other" escape hatch (AD-276).
 * Keeps compatibility-matching values consistent (no "AM5" vs "am5" drift)
 * without blocking a real value that isn't on the list yet.
 */
function AttributeSelectWithOther({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  disabled?: boolean;
}) {
  const valueIsKnown = value === "" || options.includes(value);
  // Once the admin picks "Other…" for a value not on the list, keep showing
  // the free-text box even while they're still typing (value may be "").
  const [otherMode, setOtherMode] = useState(!valueIsKnown);
  const showOther = otherMode || !valueIsKnown;
  const selectValue = showOther ? OTHER_OPTION_VALUE : value;

  return (
    <div className="space-y-1.5">
      <AdminFormLabel htmlFor={id}>{label}</AdminFormLabel>
      <Select
        id={id}
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          if (next === OTHER_OPTION_VALUE) {
            setOtherMode(true);
            return;
          }
          setOtherMode(false);
          onChange(next);
        }}
        className={adminFormControlClass}
        disabled={disabled}
      >
        <option value="">Not set</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={OTHER_OPTION_VALUE}>Other…</option>
      </Select>
      {showOther ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={BUILDER_ATTR_MAX}
          placeholder={placeholder}
          className={adminFormControlClass}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

function DescriptionToolbar() {
  const tools = [
    { icon: Bold, label: "Bold" },
    { icon: Underline, label: "Underline" },
    { icon: Italic, label: "Italic" },
    { icon: Eraser, label: "Clear formatting" },
    { icon: List, label: "Bullet list" },
    { icon: ListOrdered, label: "Numbered list" },
    { icon: AlignLeft, label: "Alignment" },
    { icon: Wand2, label: "Enhance" },
    { icon: Palette, label: "Text color" },
    { icon: Table, label: "Table" },
    { icon: Link2, label: "Link" },
    { icon: ImageIcon, label: "Image" },
    { icon: Video, label: "Video" },
    { icon: Maximize2, label: "Fullscreen" },
    { icon: Undo2, label: "Undo" },
    { icon: Redo2, label: "Redo" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border border-neutral-200 bg-neutral-50 p-1.5">
      {tools.map(({ icon: Icon, label }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          className="inline-flex size-8 items-center justify-center rounded text-neutral-600 hover:bg-white hover:text-neutral-900"
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        className="ml-1 rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
      >
        Clear
      </button>
    </div>
  );
}

export function AdminProductForm({
  mode,
  product,
  categories: initialCategories,
  brands: initialBrands,
  attributes,
  units,
  warranties,
  notes,
  labels,
  canSave,
}: {
  mode: FormMode;
  product?: EditorProduct | null;
  categories: Category[];
  brands: BrandOption[];
  attributes: ProductFormAttributeOption[];
  units: { id: string; name: string }[];
  warranties: ProductWarrantyOption[];
  notes: ProductNoteOption[];
  labels: ProductLabelOption[];
  canSave: boolean;
}) {
  const router = useRouter();
  // Local copies so a quick-created category/brand can appear in the
  // dropdown immediately, without a page refresh that would discard
  // whatever else the admin has already typed into this form.
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [brands, setBrands] = useState<BrandOption[]>(initialBrands);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingBrand, setAddingBrand] = useState(false);
  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parentSlug),
    [categories],
  );

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [brandSlug, setBrandSlug] = useState(
    product?.brandSlug ?? brands[0]?.slug ?? "",
  );
  const [categorySlug, setCategorySlug] = useState(() => {
    if (product?.categorySlug) {
      const match = categories.find(
        (item) => item.slug === product.categorySlug,
      );
      return match?.parentSlug ?? product.categorySlug;
    }
    return rootCategories[0]?.slug ?? "";
  });
  const [subcategorySlug, setSubcategorySlug] = useState(() => {
    if (!product?.categorySlug) {
      return "";
    }
    const match = categories.find((item) => item.slug === product.categorySlug);
    return match?.parentSlug ? product.categorySlug : "";
  });
  const [position, setPosition] = useState(
    product ? String(product.position) : "0",
  );
  const [variants, setVariants] = useState<ProductVariantInputFields[]>(
    () =>
      product?.variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku,
        price: String(variant.priceAmount),
        compareAt:
          variant.compareAtAmount != null
            ? String(variant.compareAtAmount)
            : "",
        isActive: variant.isActive,
        quantity: String(variant.quantity),
      })) ?? [],
  );
  const [attributeRows, setAttributeRows] = useState<ProductAttributeFormRow[]>(
    () => attributeRowsFromProduct(product?.attributes),
  );
  const [specGroupSections, setSpecGroupSections] = useState<
    SpecGroupFormSection[]
  >(() => specGroupsFromProduct(product?.specGroups));
  const [colorRows, setColorRows] = useState<ProductColorFormRow[]>(() =>
    colorRowsFromProduct(product?.colors),
  );
  const childCategories = useMemo(
    () => categories.filter((category) => category.parentSlug === categorySlug),
    [categories, categorySlug],
  );
  const [specialPrice, setSpecialPrice] = useState(
    product ? String(product.price.amount) : "0",
  );
  const [regularPrice, setRegularPrice] = useState(
    product?.compareAtPrice ? String(product.compareAtPrice.amount) : "",
  );
  const [discountStartsAt, setDiscountStartsAt] = useState(
    formatDiscountDateInput(product?.discountStartsAt),
  );
  const [discountEndsAt, setDiscountEndsAt] = useState(
    formatDiscountDateInput(product?.discountEndsAt),
  );
  const [stockQty, setStockQty] = useState(
    product ? String(product.quantity) : "25",
  );
  const [stockStatus, setStockStatus] = useState<StockStatus>(
    product?.stockStatus ?? "in_stock",
  );
  const [description, setDescription] = useState(
    product?.overview.join("\n\n") ?? "",
  );
  const [seoTitle, setSeoTitle] = useState(product?.name ?? "");
  const [seoDescription, setSeoDescription] = useState(
    product?.overview.join(" ") ?? "",
  );
  const [tags, setTags] = useState(
    product?.specs
      .map((spec) => spec.value)
      .slice(0, 4)
      .join(", ") ?? "",
  );
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [relatedProducts, setRelatedProducts] = useState<
    { id: string; slug: string; name: string }[]
  >(() => product?.relatedProducts ?? []);
  const [weight, setWeight] = useState("0.00");
  const [minPurchaseQty, setMinPurchaseQty] = useState("1");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(product?.youtubeUrl ?? "");
  const [pdfSpecificationSrc, setPdfSpecificationSrc] = useState(
    product?.pdfSpecificationSrc ?? "",
  );
  const [externalLink, setExternalLink] = useState("");
  const [externalLinkText, setExternalLinkText] = useState("");
  const [published, setPublished] = useState(product?.isActive ?? true);
  const [featured, setFeatured] = useState(product?.isNew ?? false);
  const [todaysDeal, setTodaysDeal] = useState(product?.isSale ?? false);
  const [refundable, setRefundable] = useState(false);
  const [warrantyEnabled, setWarrantyEnabled] = useState(
    product ? Boolean(product.warrantyLabel) : true,
  );
  const [warrantyOptionId, setWarrantyOptionId] = useState(() =>
    matchWarrantyOptionId(product?.warrantyLabel, warranties) ||
    warranties.find((item) => item.id === "warranty-1y")?.id ||
    warranties[0]?.id ||
    "",
  );
  const warrantyLabel =
    warranties.find((item) => item.id === warrantyOptionId)?.text ??
    product?.warrantyLabel ??
    "";
  const [noteIds, setNoteIds] = useState<string[]>(
    () => product?.notes.map((note) => note.id) ?? [],
  );
  const [labelIds, setLabelIds] = useState<string[]>(
    () => product?.labels.map((label) => label.id) ?? [],
  );
  const [freeShipping, setFreeShipping] = useState(true);
  const [flatRateShipping, setFlatRateShipping] = useState(false);
  const [quantityMultiply, setQuantityMultiply] = useState(false);
  const [codAvailable, setCodAvailable] = useState(false);
  const [hideStockState, setHideStockState] = useState(false);
  const [lowStockWarning, setLowStockWarning] = useState(
    product ? product.lowStockThreshold > 0 : true,
  );
  const [clubPoint, setClubPoint] = useState("0");
  const [tax, setTax] = useState("0");
  const [vat, setVat] = useState("0");
  const [platformFee, setPlatformFee] = useState("0");
  const [shippingDays, setShippingDays] = useState("");
  const [lowStockQty, setLowStockQty] = useState(
    product
      ? String(product.lowStockThreshold || DEFAULT_LOW_STOCK_THRESHOLD)
      : String(DEFAULT_LOW_STOCK_THRESHOLD),
  );
  const [stockDisplay, setStockDisplay] = useState<"quantity" | "text">(
    "quantity",
  );
  const [builderSlot, setBuilderSlot] = useState(product?.builderSlot ?? "");
  const [builderSocket, setBuilderSocket] = useState(
    product?.builderAttrs?.socket ?? "",
  );
  const [builderRamType, setBuilderRamType] = useState(
    product?.builderAttrs?.ramType ?? "",
  );
  const [builderFormFactor, setBuilderFormFactor] = useState(
    product?.builderAttrs?.formFactor ?? "",
  );
  const [builderTdpWatts, setBuilderTdpWatts] = useState(
    product?.builderAttrs?.tdpWatts != null
      ? String(product.builderAttrs.tdpWatts)
      : "",
  );
  const [builderStorageInterface, setBuilderStorageInterface] = useState(
    product?.builderAttrs?.storageInterface ?? "",
  );
  const [thumbnailSrc, setThumbnailSrc] = useState(
    product?.image.src && product.image.src !== "/products/placeholder.svg"
      ? product.image.src
      : "",
  );
  const [gallerySrc, setGallerySrc] = useState(
    product?.images?.[1]?.src &&
      product.images[1].src !== "/products/placeholder.svg"
      ? product.images[1].src
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cloning, startCloneTransition] = useTransition();

  const pricePreview = useMemo(() => {
    const special = Number.parseFloat(specialPrice.replace(/,/g, ""));
    const regular = Number.parseFloat(regularPrice.replace(/,/g, ""));
    if (!Number.isFinite(special) || special < 0) {
      return null;
    }
    if (!Number.isFinite(regular) || regular <= special) {
      return null;
    }
    const saved = regular - special;
    const percent = Math.round((saved / regular) * 100);
    return { special, regular, saved, percent };
  }, [specialPrice, regularPrice]);

  function handleSubmit(event: React.FormEvent, publish = true) {
    event.preventDefault();
    setError(null);

    if (!canSave) {
      setError("You do not have permission to save products.");
      return;
    }

    startTransition(async () => {
      const result = await saveAdminProductAction({
        currentId: mode === "edit" ? product?.id : undefined,
        fields: {
          name,
          slug,
          sku,
          brandSlug,
          categorySlug: subcategorySlug || categorySlug,
          position,
          price: specialPrice,
          compareAt: regularPrice.trim() ? regularPrice : "0",
          discountValue: "0",
          discountType: "percent",
          discountStartsAt,
          discountEndsAt,
          overview: description,
          quantity: stockQty,
          lowStockThreshold: lowStockWarning ? lowStockQty : "0",
          isActive: publish,
          isNew: featured,
          isSale:
            todaysDeal ||
            (Number.parseFloat(regularPrice) >
              Number.parseFloat(specialPrice)),
          warrantyEnabled,
          warrantyLabel,
          noteIds,
          labelIds,
          barcode,
          relatedProductIds: relatedProducts.map((item) => item.id),
          variants,
          attributes: attributeRows
            .filter((row) => row.key.trim().length > 0)
            .map((row) => ({
              key: row.key,
              value: row.value,
            })),
          specGroups: specGroupSections.map((group) => ({
            title: group.title,
            rows: group.rows.map((row) => ({
              key: row.key,
              value: row.value,
            })),
          })),
          colors: colorRows.map((row) => ({
            name: row.name,
            hex: row.hex,
            images: row.imageSrcs,
          })),
          builderSlot,
          builderSocket,
          builderRamType,
          builderFormFactor,
          builderTdpWatts,
          builderStorageInterface,
          youtubeUrl,
          pdfSpecificationSrc,
          thumbnailSrc,
          gallerySrc,
        },
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the product.");
        return;
      }
      notifySuccess(
        publish
          ? mode === "create"
            ? "Product published"
            : "Product saved & published"
          : mode === "create"
            ? "Product saved as draft"
            : "Product saved unpublished",
      );
      router.refresh();
      if (mode === "create" || result.id !== product?.id) {
        router.push(`/admin/products/${result.id}`);
      }
    });
  }

  return (
    <form
      onSubmit={(event) => handleSubmit(event, true)}
      className="mx-auto max-w-[1400px] space-y-5 pb-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-caption font-medium text-primary">
            <Link href="/admin/products" className="hover:underline">
              Products
            </Link>
            <span className="text-text-muted">
              {" "}
              / {mode === "create" ? "New" : "Edit"}
            </span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-800">
            {mode === "create" ? "Add new product" : "Edit product"}
          </h1>
          {mode === "edit" && product ? (
            <p className="mt-1 text-body text-text-muted">{product.name}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "create" ? (
            <Link
              href="/admin/catalog/import"
              title="Add many products at once from a CSV file"
              className={buttonClassName({
                variant: "secondary",
                size: "sm",
                className: "bg-amber-400 text-neutral-900 hover:bg-amber-500",
              })}
            >
              Import product
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled={cloning}
                onClick={() => {
                  if (!product) {
                    return;
                  }
                  startCloneTransition(async () => {
                    const result = await cloneAdminProductAction(product.id);
                    if (!result.ok) {
                      notifyError(result.formError);
                      return;
                    }
                    notifySuccess("Product cloned — opening the new draft");
                    router.push(`/admin/products/${result.id}`);
                    router.refresh();
                  });
                }}
                className={buttonClassName({
                  variant: "ghost",
                  size: "sm",
                  className:
                    "border border-[#3897f0] text-[#3897f0] hover:bg-blue-50",
                })}
              >
                {cloning ? "Duplicating…" : "Duplicate"}
              </button>
              <Link
                href={`/product/${product?.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                  className: "bg-amber-400 text-neutral-900 hover:bg-amber-500",
                })}
              >
                View on store
              </Link>
            </>
          )}
        </div>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <AdminFormCard title="Product basic information">
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="product-name" required>
                Product name
              </AdminFormLabel>
              <Input
                id="product-name"
                placeholder="Product name"
                value={name}
                onChange={(event) => {
                  const next = event.target.value;
                  setName(next);
                  if (mode === "create") {
                    setSlug(slugify(next));
                  }
                  if (!seoTitle || seoTitle === name) {
                    setSeoTitle(next);
                  }
                }}
                className={adminFormControlClass}
                required
              />
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="product-slug" required>
                URL slug
              </AdminFormLabel>
              <Input
                id="product-slug"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
                placeholder="product-url-slug"
                className={adminFormControlClass}
                required
              />
              <p className="text-xs text-neutral-500">
                Storefront path: /product/{slug || "…"}
              </p>
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="product-position">
                Ordering number
              </AdminFormLabel>
              <Input
                id="product-position"
                inputMode="numeric"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                className={adminFormControlClass}
                disabled={pending}
              />
              <p className="text-xs text-neutral-500">
                Lower number appears first in featured catalogue order.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="product-category" required>
                  Select main category
                </AdminFormLabel>
                <Select
                  id="product-category"
                  value={categorySlug}
                  onChange={(event) => {
                    setCategorySlug(event.target.value);
                    setSubcategorySlug("");
                  }}
                  className={adminFormControlClass}
                  disabled={pending}
                >
                  <option value="">Select main category</option>
                  {rootCategories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                <AdminFormInlineLink onClick={() => setAddingCategory(true)}>
                  + New category
                </AdminFormInlineLink>
              </div>
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="product-brand">Brand</AdminFormLabel>
                <Select
                  id="product-brand"
                  value={brandSlug}
                  onChange={(event) => setBrandSlug(event.target.value)}
                  className={adminFormControlClass}
                >
                  <option value="">Select brand</option>
                  {brands.map((brand) => (
                    <option key={brand.slug} value={brand.slug}>
                      {brand.name}
                    </option>
                  ))}
                </Select>
                <AdminFormInlineLink onClick={() => setAddingBrand(true)}>
                  + New brand
                </AdminFormInlineLink>
              </div>
            </div>
            {childCategories.length > 0 ? (
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="product-subcategory">
                  Subcategory
                </AdminFormLabel>
                <Select
                  id="product-subcategory"
                  value={subcategorySlug}
                  onChange={(event) => setSubcategorySlug(event.target.value)}
                  className={adminFormControlClass}
                  disabled={pending}
                >
                  <option value="">Use main category</option>
                  {childCategories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-neutral-500">
                  The product is filed under this category on the storefront.
                </p>
              </div>
            ) : null}
          </AdminFormCard>

          <AdminFormCard title="Product configuration">
            <div className="space-y-1.5">
              <AdminFormLabel required>Related categories</AdminFormLabel>
              <p className="text-xs text-neutral-500">
                Extra category links are not stored yet. The subcategory above
                is the product&apos;s category.
              </p>
              <Select className={adminFormControlClass} defaultValue="">
                <option value="">Nothing selected</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="product-unit">Unit</AdminFormLabel>
                <Select
                  id="product-unit"
                  className={adminFormControlClass}
                  value={unitId}
                  onChange={(event) => setUnitId(event.target.value)}
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </Select>
                <Link
                  href="/admin/units"
                  className="inline-block text-xs font-medium text-[#3897f0] hover:underline"
                >
                  + New unit
                </Link>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <AdminFormLabel htmlFor="product-warranty-main">
                  Warranty
                </AdminFormLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    id="product-warranty-main"
                    className={cn(adminFormControlClass, "min-w-[12rem] flex-1")}
                    value={warrantyEnabled ? warrantyOptionId : ""}
                    disabled={!warrantyEnabled}
                    onChange={(event) =>
                      setWarrantyOptionId(event.target.value)
                    }
                  >
                    <option value="" disabled>
                      {warrantyEnabled
                        ? "Select warranty"
                        : "Warranty disabled"}
                    </option>
                    {warranties.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.badge} — {item.text}
                      </option>
                    ))}
                  </Select>
                  <Link
                    href="/admin/warranty"
                    className="text-xs font-medium text-[#3897f0] hover:underline"
                  >
                    Manage warranties
                  </Link>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="product-weight">
                  Weight (in kg)
                </AdminFormLabel>
                <Input
                  id="product-weight"
                  inputMode="decimal"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className={adminFormControlClass}
                />
              </div>
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="min-purchase" required>
                  Minimum purchase qty
                </AdminFormLabel>
                <Input
                  id="min-purchase"
                  inputMode="numeric"
                  value={minPurchaseQty}
                  onChange={(event) => setMinPurchaseQty(event.target.value)}
                  className={adminFormControlClass}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="product-barcode">Barcode</AdminFormLabel>
              <div className="flex gap-0">
                <Input
                  id="product-barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  maxLength={PRODUCT_BARCODE_MAX}
                  className={cn(adminFormControlClass, "rounded-r-none")}
                />
                <button
                  type="button"
                  onClick={() => {
                    setBarcode(`TH-${Date.now().toString().slice(-8)}`);
                  }}
                  className="inline-flex h-9 shrink-0 items-center rounded-r-md bg-neutral-700 px-4 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-neutral-500">
                Must be unique across the catalogue. Saved with the rest of
                this form.
              </p>
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="product-tags" required>
                Tags
              </AdminFormLabel>
              <Input
                id="product-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Type and hit enter to add a tag"
                className={adminFormControlClass}
              />
              <p className="text-xs text-neutral-500">
                Used for search. Add words customers may use to find this
                product.
              </p>
            </div>
          </AdminFormCard>

          <AdminFormCard title="Files & media">
            <p className="text-xs text-neutral-500">
              Click a box to open the media library — upload from your PC or
              choose an existing file, then Save.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <AdminFormUploadBox
                label="Add thumbnail image"
                sizeHint="300px × 300px"
                previewSrc={thumbnailSrc || product?.image.src}
                previewAlt={product?.image.alt ?? product?.name ?? ""}
                value={thumbnailSrc}
                onChange={setThumbnailSrc}
                folder="products"
              />
              <AdminFormUploadBox
                label="Add gallery images"
                required
                sizeHint="800px × 800px"
                previewSrc={
                  gallerySrc ||
                  product?.images?.[1]?.src ||
                  product?.images?.[0]?.src
                }
                previewAlt={product?.name ?? ""}
                value={gallerySrc}
                onChange={setGallerySrc}
                folder="products"
              />
            </div>
            <div className="space-y-2">
              <AdminFormLabel htmlFor="youtube-url">
                Youtube video / shorts link
              </AdminFormLabel>
              <p className="text-xs text-neutral-500">
                Paste a YouTube video or Shorts URL. The video will display on
                the product page.
              </p>
              <Input
                id="youtube-url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className={adminFormControlClass}
              />
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel>PDF specification</AdminFormLabel>
              <p className="text-xs text-neutral-500">
                Upload a PDF or paste a direct PDF link. Shoppers can open it on
                the product page.
              </p>
              <AdminProductPdfField
                value={pdfSpecificationSrc}
                onChange={setPdfSpecificationSrc}
                disabled={pending}
              />
            </div>
          </AdminFormCard>

          <AdminFormCard title="Product description">
            <DescriptionToolbar />
            <Textarea
              rows={8}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[12rem] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
            />
          </AdminFormCard>

          <AdminFormCard title="SEO meta tags">
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="seo-title">Meta title</AdminFormLabel>
              <Input
                id="seo-title"
                value={seoTitle}
                onChange={(event) => setSeoTitle(event.target.value)}
                placeholder="Meta title"
                className={adminFormControlClass}
              />
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="seo-description">
                Description
              </AdminFormLabel>
              <Textarea
                id="seo-description"
                rows={4}
                value={seoDescription}
                onChange={(event) => setSeoDescription(event.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel>Meta image</AdminFormLabel>
              <div className="flex gap-0">
                <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600">
                  Browse
                </span>
                <Input
                  readOnly
                  placeholder="Choose file"
                  className={cn(adminFormControlClass, "rounded-l-none")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="seo-tags" required>
                Tags
              </AdminFormLabel>
              <Input
                id="seo-tags"
                placeholder="Type and hit enter to add a tag"
                className={adminFormControlClass}
              />
            </div>
          </AdminFormCard>

          <AdminFormCard title="Product price + stock">
            <AdminFormDivider />
            <div className="space-y-1.5">
              <AdminFormLabel>Colours</AdminFormLabel>
              <AdminProductColorsFields
                rows={colorRows}
                onChange={setColorRows}
              />
            </div>
            <AdminFormDivider />
            <AdminProductAttributesFields
              attributes={attributes}
              rows={attributeRows}
              onRowsChange={setAttributeRows}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="special-price" required>
                  Special price
                </AdminFormLabel>
                <Input
                  id="special-price"
                  inputMode="numeric"
                  value={specialPrice}
                  onChange={(event) => setSpecialPrice(event.target.value)}
                  className={adminFormControlClass}
                  required
                />
                <p className="text-xs text-neutral-500">
                  Price customers pay (storefront “Special price”).
                </p>
              </div>
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="regular-price">
                  Regular price
                </AdminFormLabel>
                <Input
                  id="regular-price"
                  inputMode="numeric"
                  value={regularPrice}
                  onChange={(event) => setRegularPrice(event.target.value)}
                  className={adminFormControlClass}
                  placeholder="Optional — higher than special"
                />
                <p className="text-xs text-neutral-500">
                  Struck-through list price. Leave empty for no discount look.
                </p>
              </div>
            </div>
            {pricePreview ? (
              <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                Save ৳ {pricePreview.saved.toLocaleString("en-BD")} (
                {pricePreview.percent}% off) — special ৳{" "}
                {pricePreview.special.toLocaleString("en-BD")} vs regular ৳{" "}
                {pricePreview.regular.toLocaleString("en-BD")}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="discount-start">
                  Discount start
                </AdminFormLabel>
                <Input
                  id="discount-start"
                  type="date"
                  value={discountStartsAt}
                  onChange={(event) => setDiscountStartsAt(event.target.value)}
                  className={adminFormControlClass}
                />
              </div>
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="discount-end">
                  Discount end
                </AdminFormLabel>
                <Input
                  id="discount-end"
                  type="date"
                  value={discountEndsAt}
                  onChange={(event) => setDiscountEndsAt(event.target.value)}
                  className={adminFormControlClass}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="stock-qty">Stock</AdminFormLabel>
                <Input
                  id="stock-qty"
                  inputMode="numeric"
                  value={stockQty}
                  onChange={(event) => {
                    const next = event.target.value;
                    setStockQty(next);
                    const qty = Number.parseInt(next, 10);
                    const threshold = Number.parseInt(lowStockQty, 10);
                    setStockStatus(
                      deriveStockStatus(
                        Number.isFinite(qty) ? qty : 0,
                        product?.reserved ?? 0,
                        Number.isFinite(threshold)
                          ? threshold
                          : DEFAULT_LOW_STOCK_THRESHOLD,
                      ),
                    );
                  }}
                  className={adminFormControlClass}
                  disabled={pending}
                />
                <p className="text-xs text-neutral-500">
                  Status is calculated from quantity minus reserved units.
                  {product && product.reserved > 0
                    ? ` ${product.reserved} unit(s) are reserved.`
                    : ""}
                </p>
              </div>
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="stock-status">
                  Stock status
                </AdminFormLabel>
                <Select
                  id="stock-status"
                  value={stockStatus}
                  onChange={(event) => {
                    const next = event.target.value as StockStatus;
                    setStockStatus(next);
                    setStockQty(stockQtyFromStatus(next));
                  }}
                  className={adminFormControlClass}
                  disabled={pending}
                >
                  <option value="in_stock">In stock</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="product-sku">SKU</AdminFormLabel>
              <div className="flex gap-0">
                <Input
                  id="product-sku"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="Product SKU"
                  className={cn(adminFormControlClass, "rounded-r-none")}
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setSku(`TH-SKU-${Date.now().toString().slice(-6)}`);
                  }}
                  className="inline-flex h-9 shrink-0 items-center rounded-r-md bg-neutral-700 px-4 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="external-link">
                  Product external link
                </AdminFormLabel>
                <Input
                  id="external-link"
                  value={externalLink}
                  onChange={(event) => setExternalLink(event.target.value)}
                  placeholder="External link"
                  className={adminFormControlClass}
                />
              </div>
              <div className="space-y-1.5">
                <AdminFormLabel htmlFor="external-link-text">
                  Link button text
                </AdminFormLabel>
                <Input
                  id="external-link-text"
                  value={externalLinkText}
                  onChange={(event) => setExternalLinkText(event.target.value)}
                  placeholder="External link button text"
                  className={adminFormControlClass}
                />
              </div>
            </div>
            <input type="hidden" name="slug" value={slug} />
          </AdminFormCard>

          <AdminFormCard title="PC Builder">
            <p className="text-xs text-neutral-500">
              Assign this product to one builder slot. Leave empty if it is not
              a PC part. Compatibility fields are optional — missing data shows
              as unknown later, never as a false match.
            </p>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="builder-slot">
                Builder slot
              </AdminFormLabel>
              <Select
                id="builder-slot"
                value={builderSlot}
                onChange={(event) => {
                  const next = event.target.value;
                  setBuilderSlot(next);
                  if (!next) {
                    setBuilderSocket("");
                    setBuilderRamType("");
                    setBuilderFormFactor("");
                    setBuilderTdpWatts("");
                    setBuilderStorageInterface("");
                  }
                }}
                className={adminFormControlClass}
                disabled={pending}
              >
                <option value="">Not a builder part</option>
                {BUILDER_SLOTS.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.label}
                  </option>
                ))}
              </Select>
            </div>
            {builderSlot ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <AttributeSelectWithOther
                  id="builder-socket"
                  label="Socket"
                  value={builderSocket}
                  onChange={setBuilderSocket}
                  options={SOCKET_OPTIONS}
                  placeholder="AM5"
                  disabled={pending}
                />
                <AttributeSelectWithOther
                  id="builder-ram"
                  label="RAM type"
                  value={builderRamType}
                  onChange={setBuilderRamType}
                  options={RAM_TYPE_OPTIONS}
                  placeholder="DDR5"
                  disabled={pending}
                />
                <AttributeSelectWithOther
                  id="builder-form"
                  label="Form factor"
                  value={builderFormFactor}
                  onChange={setBuilderFormFactor}
                  options={FORM_FACTOR_OPTIONS}
                  placeholder="Micro-ATX"
                  disabled={pending}
                />
                <AttributeSelectWithOther
                  id="builder-storage-interface"
                  label="Storage interface"
                  value={builderStorageInterface}
                  onChange={setBuilderStorageInterface}
                  options={STORAGE_INTERFACE_OPTIONS}
                  placeholder="NVMe"
                  disabled={pending}
                />
                <div className="space-y-1.5">
                  <AdminFormLabel htmlFor="builder-tdp">
                    TDP / wattage
                  </AdminFormLabel>
                  <Input
                    id="builder-tdp"
                    inputMode="numeric"
                    value={builderTdpWatts}
                    onChange={(event) => setBuilderTdpWatts(event.target.value)}
                    placeholder="65"
                    className={adminFormControlClass}
                    disabled={pending}
                  />
                </div>
              </div>
            ) : null}
          </AdminFormCard>

          <AdminFormCard title="Variants">
            <p className="text-xs text-neutral-500">
              Optional SKU rows for this product. Leave empty if the product has
              a single price.
            </p>
            {variants.map((variant, index) => (
              <div
                key={`variant-${index}`}
                className="grid gap-3 rounded-md border border-neutral-200 p-3 sm:grid-cols-2"
              >
                <div className="space-y-1.5">
                  <AdminFormLabel htmlFor={`variant-name-${index}`}>
                    Name
                  </AdminFormLabel>
                  <Input
                    id={`variant-name-${index}`}
                    value={variant.name}
                    onChange={(event) => {
                      const next = [...variants];
                      next[index] = { ...variant, name: event.target.value };
                      setVariants(next);
                    }}
                    className={adminFormControlClass}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <AdminFormLabel htmlFor={`variant-sku-${index}`}>
                    SKU
                  </AdminFormLabel>
                  <Input
                    id={`variant-sku-${index}`}
                    value={variant.sku}
                    onChange={(event) => {
                      const next = [...variants];
                      next[index] = { ...variant, sku: event.target.value };
                      setVariants(next);
                    }}
                    className={adminFormControlClass}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <AdminFormLabel htmlFor={`variant-price-${index}`}>
                    Price
                  </AdminFormLabel>
                  <Input
                    id={`variant-price-${index}`}
                    inputMode="numeric"
                    value={variant.price}
                    onChange={(event) => {
                      const next = [...variants];
                      next[index] = { ...variant, price: event.target.value };
                      setVariants(next);
                    }}
                    className={adminFormControlClass}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <AdminFormLabel htmlFor={`variant-compare-${index}`}>
                    Compare-at
                  </AdminFormLabel>
                  <Input
                    id={`variant-compare-${index}`}
                    inputMode="numeric"
                    value={variant.compareAt}
                    onChange={(event) => {
                      const next = [...variants];
                      next[index] = {
                        ...variant,
                        compareAt: event.target.value,
                      };
                      setVariants(next);
                    }}
                    className={adminFormControlClass}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <AdminFormLabel htmlFor={`variant-qty-${index}`}>
                    Stock
                  </AdminFormLabel>
                  <Input
                    id={`variant-qty-${index}`}
                    inputMode="numeric"
                    value={variant.quantity}
                    onChange={(event) => {
                      const next = [...variants];
                      next[index] = {
                        ...variant,
                        quantity: event.target.value,
                      };
                      setVariants(next);
                    }}
                    className={adminFormControlClass}
                    disabled={pending}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={variant.isActive}
                    onChange={(event) => {
                      const next = [...variants];
                      next[index] = {
                        ...variant,
                        isActive: event.target.checked,
                      };
                      setVariants(next);
                    }}
                    className="size-4 rounded border-border accent-[#3897f0]"
                    disabled={pending}
                  />
                  Active
                  <button
                    type="button"
                    className="ml-auto text-xs font-medium text-red-600 hover:underline"
                    onClick={() =>
                      setVariants(variants.filter((_, i) => i !== index))
                    }
                    disabled={pending}
                  >
                    Remove
                  </button>
                </label>
              </div>
            ))}
            <AdminFormDashedButton
              onClick={() => setVariants([...variants, emptyVariant()])}
            >
              Add variant
            </AdminFormDashedButton>
          </AdminFormCard>

          <AdminFormCard title="Labels">
            <AdminProductLabelsFields
              labels={labels}
              selectedIds={labelIds}
              onChange={setLabelIds}
            />
          </AdminFormCard>

          <AdminFormCard title="Notes">
            <AdminProductNotesFields
              notes={notes}
              selectedIds={noteIds}
              onChange={setNoteIds}
            />
          </AdminFormCard>

          <AdminFormCard title="Specifications">
            <AdminProductSpecGroupsFields
              groups={specGroupSections}
              onChange={setSpecGroupSections}
            />
          </AdminFormCard>
        </div>

        <AdminProductFormSidebar
          published={published}
          setPublished={setPublished}
          featured={featured}
          setFeatured={setFeatured}
          todaysDeal={todaysDeal}
          setTodaysDeal={setTodaysDeal}
          refundable={refundable}
          setRefundable={setRefundable}
          warrantyEnabled={warrantyEnabled}
          setWarrantyEnabled={setWarrantyEnabled}
          warranties={warranties}
          warrantyOptionId={warrantyOptionId}
          setWarrantyOptionId={setWarrantyOptionId}
          notes={notes}
          noteIds={noteIds}
          setNoteIds={setNoteIds}
          relatedProducts={relatedProducts}
          setRelatedProducts={setRelatedProducts}
          excludeProductId={mode === "edit" ? product?.id : undefined}
          freeShipping={freeShipping}
          setFreeShipping={setFreeShipping}
          flatRateShipping={flatRateShipping}
          setFlatRateShipping={setFlatRateShipping}
          quantityMultiply={quantityMultiply}
          setQuantityMultiply={setQuantityMultiply}
          codAvailable={codAvailable}
          setCodAvailable={setCodAvailable}
          hideStockState={hideStockState}
          setHideStockState={setHideStockState}
          lowStockWarning={lowStockWarning}
          setLowStockWarning={setLowStockWarning}
          clubPoint={clubPoint}
          setClubPoint={setClubPoint}
          tax={tax}
          setTax={setTax}
          vat={vat}
          setVat={setVat}
          platformFee={platformFee}
          setPlatformFee={setPlatformFee}
          shippingDays={shippingDays}
          setShippingDays={setShippingDays}
          lowStockQty={lowStockQty}
          setLowStockQty={setLowStockQty}
          stockDisplay={stockDisplay}
          setStockDisplay={setStockDisplay}
        />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-5">
        <Button
          type="submit"
          disabled={pending || !canSave}
          className="min-h-11 bg-emerald-600 px-6 hover:bg-emerald-700"
        >
          {pending ? "Saving…" : "Save & publish"}
        </Button>
        <Button
          type="button"
          disabled={pending || !canSave}
          onClick={(event) => handleSubmit(event, false)}
          className="min-h-11 bg-violet-600 px-6 hover:bg-violet-700"
        >
          Save & unpublish
        </Button>
        <Link
          href="/admin/products"
          className={buttonClassName({
            variant: "ghost",
            className: "border border-neutral-200",
          })}
        >
          Cancel
        </Link>
      </div>

      <AdminQuickCreateCategoryModal
        open={addingCategory}
        onClose={() => setAddingCategory(false)}
        onCreated={(category) => {
          setCategories((current) => [
            ...current,
            {
              slug: category.slug,
              name: category.name,
              parentSlug: null,
              filterKeys: [],
            },
          ]);
          setCategorySlug(category.slug);
          setSubcategorySlug("");
        }}
      />
      <AdminQuickCreateBrandModal
        open={addingBrand}
        onClose={() => setAddingBrand(false)}
        onCreated={(brand) => {
          setBrands((current) => [...current, brand]);
          setBrandSlug(brand.slug);
        }}
      />
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { RichTextEditor } from "@/features/admin/marketing/rich-text-editor";
import {
  cloneAdminProductAction,
  saveAdminProductAction,
} from "@/features/admin/products/product-actions";
import {
  AdminQuickCreateBrandModal,
  AdminQuickCreateCategoryModal,
} from "@/features/admin/products/admin-quick-create-category-brand";
import {
  PRODUCT_BARCODE_MAX,
  PRODUCT_MODEL_NUMBER_MAX,
  slugifyProduct,
} from "@/lib/catalog/product-input";
import { AdminBuilderMultiSelect } from "@/features/admin/products/admin-builder-multi-select";
import {
  BUILDER_SLOTS,
  defaultSlotForCategory,
  isBuilderSlotId,
} from "@/lib/domain/pc-builder";
import {
  builderAttributeCopy,
  FORM_FACTOR_OPTIONS,
  RAM_TYPE_OPTIONS,
  SLOT_ATTRIBUTE_FIELDS,
  SOCKET_OPTIONS,
  STORAGE_INTERFACE_OPTIONS,
  type BuilderAttrField,
} from "@/lib/domain/pc-builder/attribute-options";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  deriveStockStatus,
} from "@/lib/catalog/inventory-input";
import {
  AdminFormCard,
  AdminFormDivider,
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
  AdminProductB2BFields,
  type AdminProductB2BTerms,
} from "@/features/admin/products/admin-product-b2b-fields";
import { AdminProductGalleryFields } from "@/features/admin/products/admin-product-gallery-fields";
import {
  AdminProductLabelsFields,
  AdminProductNotesFields,
} from "@/features/admin/products/admin-product-notes-labels-fields";
import { AdminProductPromotionsFields } from "@/features/admin/products/admin-product-promotions-fields";
import type { AssignablePromotionOption } from "@/lib/marketing/promotions";
import { AdminProductPdfField } from "@/features/admin/products/admin-product-pdf-field";
import {
  AdminProductSpecGroupsFields,
  specGroupsFromProduct,
  type SpecGroupFormSection,
} from "@/features/admin/products/admin-product-spec-groups-fields";
import { AdminProductFormSidebar } from "@/features/admin/products/admin-product-form-sidebar";
import type { ProductFormAttributeOption } from "@/lib/admin/load-products";
import {
  DEFAULT_PRODUCT_FORM_ORDER,
  type ProductFormSectionId,
} from "@/lib/catalog/product-form-layout";
import type { Category, ProductDetail, StockStatus } from "@/lib/data";
import {
  categoryDescendantsWithDepth,
  categoryRootSlug,
} from "@/lib/catalog/category-tree";
import { AdminSearchableSelect } from "@/features/admin/products/admin-searchable-select";
import {
  AdminProductVariantsFields,
  variantFormFromProduct,
  variantFormSummary,
  variantFormToInput,
  type VariantFormState,
} from "@/features/admin/products/admin-product-variants-fields";
import type { SearchableOption } from "@/lib/admin/searchable-options";
import {
  formatDiscountDateInput,
} from "@/lib/catalog/discount-pricing";
import {
  matchWarrantyOptionId,
  warrantyBadgeFromLabel,
  type ProductWarrantyOption,
} from "@/lib/catalog/warranty-badge";
import type {
  ProductLabelOption,
  ProductNoteOption,
} from "@/lib/catalog/product-notes-labels";
import { cn } from "@/lib/cn";
import {
  generateProductSeo,
  SEO_DESC_MAX,
  SEO_TITLE_MAX,
  type SpecFact,
} from "@/lib/seo/product-seo";

type FormMode = "create" | "edit";
type BrandOption = { slug: string; name: string };

// A–Z order for the category/brand pickers: case-insensitive, and
// "PC 2" sorts before "PC 10".
const nameCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});
function byName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => nameCollator.compare(a.name, b.name));
}

type EditorProduct = ProductDetail & {
  isActive: boolean;
  position: number;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  variants: Array<{
    id: string;
    name: string;
    optionValues?: string[];
    sku: string;
    priceAmount: number;
    compareAtAmount: number | null;
    isActive: boolean;
    quantity: number;
    reserved?: number;
    imageSrc?: string | null;
    imageSrcs?: string[];
    title?: string | null;
  }>;
  variantOptionNames?: string[];
  barcode: string;
  relatedProducts: { id: string; slug: string; name: string }[];
};

/** Select value for an edited product's warranty that is not an active preset. */
const CURRENT_WARRANTY_OPTION_ID = "__current-warranty__";

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
  b2bTerms = null,
  promotions,
  assignedPromotionIds = [],
  canManagePromotions = false,
  sectionOrder = DEFAULT_PRODUCT_FORM_ORDER,
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
  /** Only ever loaded in edit mode — a new product has no id to key the
   * separate `B2BProductPrice` row off yet. */
  b2bTerms?: AdminProductB2BTerms | null;
  /** Only ever loaded in edit mode, same reason — a new product has no id to
   * key a `PromotionProduct` row off yet. */
  promotions?: AssignablePromotionOption[];
  assignedPromotionIds?: string[];
  canManagePromotions?: boolean;
  /** Admin-configurable (Admin -> Catalog -> Product form layout, AD-383).
   * Section order is applied purely at render time — the sections
   * themselves are unchanged, only their sequence in the main column. */
  sectionOrder?: ProductFormSectionId[];
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
      return categoryRootSlug(product.categorySlug, categories);
    }
    return rootCategories[0]?.slug ?? "";
  });
  const [subcategorySlug, setSubcategorySlug] = useState(() => {
    if (!product?.categorySlug) {
      return "";
    }
    const root = categoryRootSlug(product.categorySlug, categories);
    return product.categorySlug !== root ? product.categorySlug : "";
  });
  const [position, setPosition] = useState(
    product ? String(product.position) : "0",
  );
  const [variantForm, setVariantForm] = useState<VariantFormState>(() =>
    variantFormFromProduct(product?.variantOptionNames, product?.variants),
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
  // Display order only; defaults above still use the stored order.
  const sortedCategories = useMemo(() => byName(categories), [categories]);
  const sortedBrands = useMemo(() => byName(brands), [brands]);
  // Siblings come out A–Z because the walk follows the input order; each
  // child still sits directly under its parent.
  const childCategories = useMemo(
    () => categoryDescendantsWithDepth(categorySlug, sortedCategories),
    [sortedCategories, categorySlug],
  );
  // "Parent › Child" trail per category, shown beside each option and
  // searched along with its name, so typing a parent finds its children.
  const categoryTrail = useMemo(() => {
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    const trail = new Map<string, string>();
    for (const category of categories) {
      const names: string[] = [];
      const seen = new Set<string>();
      let parentSlug = category.parentSlug;
      while (parentSlug && !seen.has(parentSlug)) {
        seen.add(parentSlug);
        const parent = bySlug.get(parentSlug);
        if (!parent) {
          break;
        }
        names.unshift(parent.name);
        parentSlug = parent.parentSlug;
      }
      trail.set(category.slug, names.join(" › "));
    }
    return trail;
  }, [categories]);
  const rootCategoryOptions = useMemo<SearchableOption[]>(
    () =>
      byName(rootCategories).map((category) => ({
        value: category.slug,
        label: category.name,
      })),
    [rootCategories],
  );
  const subcategoryOptions = useMemo<SearchableOption[]>(
    () =>
      childCategories.map((category) => ({
        value: category.slug,
        label: category.name,
        hint: categoryTrail.get(category.slug) || undefined,
        depth: category.depth,
      })),
    [childCategories, categoryTrail],
  );
  const allCategoryOptions = useMemo<SearchableOption[]>(
    () =>
      sortedCategories
        .map((category) => ({
          value: category.slug,
          label: category.name,
          hint: categoryTrail.get(category.slug) || undefined,
        }))
        // Same-named categories (e.g. two "Intel PC") order by their trail.
        .sort(
          (a, b) =>
            nameCollator.compare(a.label, b.label) ||
            nameCollator.compare(a.hint ?? "", b.hint ?? ""),
        ),
    [sortedCategories, categoryTrail],
  );
  // Not stored yet (see the note under "Related categories"); kept in state
  // only so the searchable picker behaves like a real control.
  const [relatedCategorySlug, setRelatedCategorySlug] = useState("");
  const [specialPriceInput, setSpecialPrice] = useState(
    product ? String(product.price.amount) : "0",
  );
  const [regularPriceInput, setRegularPrice] = useState(
    product?.compareAtPrice ? String(product.compareAtPrice.amount) : "",
  );
  const [discountStartsAt, setDiscountStartsAt] = useState(
    formatDiscountDateInput(product?.discountStartsAt),
  );
  const [discountEndsAt, setDiscountEndsAt] = useState(
    formatDiscountDateInput(product?.discountEndsAt),
  );
  const [stockQtyInput, setStockQty] = useState(
    product ? String(product.quantity) : "25",
  );
  // While any variant is active the product's own price is its cheapest
  // variant and its stock the variants' total (the server enforces both,
  // see AD-388) — the fields show that and lock instead of being ignored.
  const variantSummary = variantFormSummary(variantForm);
  const variantsDrivePricing = variantSummary.active > 0;
  const specialPrice = variantsDrivePricing
    ? (variantSummary.lowestPrice?.price ?? "")
    : specialPriceInput;
  const regularPrice = variantsDrivePricing
    ? (variantSummary.lowestPrice?.compareAt ?? "")
    : regularPriceInput;
  const stockQty = variantsDrivePricing
    ? String(variantSummary.totalStock)
    : stockQtyInput;
  const [stockStatus, setStockStatus] = useState<StockStatus>(
    product?.stockStatus ?? "in_stock",
  );
  // Legacy plain-text bullets — no editor exposed for this anymore (see
  // "Quick overview"/"Details" below), it just round-trips unchanged so a
  // product imported via bulk CSV keeps its <meta description> fallback.
  const [description] = useState(product?.overview.join("\n\n") ?? "");
  const [overviewHtml, setOverviewHtml] = useState(
    product?.overviewHtml ?? "",
  );
  const [detailsHtml, setDetailsHtml] = useState(product?.detailsHtml ?? "");
  // Stored SEO text (SEO phase 8). Empty = the page uses the standard template.
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    product?.metaDescription ?? "",
  );
  const [tags, setTags] = useState(
    product?.specs
      .map((spec) => spec.value)
      .slice(0, 4)
      .join(", ") ?? "",
  );
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [modelNumber, setModelNumber] = useState(
    product?.modelNumber ?? "",
  );
  // The generated title / description for what is on the form right now (same
  // generator the apply script uses). Shown as the placeholder and offered
  // through "Use suggestion"; it is NOT saved unless the admin accepts it.
  const seoSuggestion = useMemo(() => {
    const chain: string[] = [];
    for (
      let cur = categories.find((c) => c.slug === (subcategorySlug || categorySlug));
      cur && chain.length < 8;
      cur = cur.parentSlug ? categories.find((c) => c.slug === cur?.parentSlug) : undefined
    ) {
      chain.push(cur.name);
    }
    const labelOf = new Map(attributes.map((a) => [a.key, a.name]));
    const specs: SpecFact[] = [
      ...attributeRows
        .filter((row) => row.key.trim() && row.value.trim())
        .map((row) => ({ key: row.key, label: labelOf.get(row.key) ?? row.key, value: row.value })),
      ...specGroupSections.flatMap((group) =>
        group.rows
          .filter((row) => row.key.trim() && row.value.trim())
          .map((row) => ({ label: row.key, value: row.value })),
      ),
    ];
    if (!name.trim()) {
      return null;
    }
    return generateProductSeo({
      id: product?.id ?? "new",
      name,
      sku,
      modelNumber: modelNumber || null,
      brand: brands.find((b) => b.slug === brandSlug)?.name ?? "",
      categoryChain: chain,
      specs,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, sku, modelNumber, brandSlug, categorySlug, subcategorySlug, categories, brands, attributeRows, specGroupSections, attributes]);
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
  const [comingSoon, setComingSoon] = useState(
    product?.isComingSoon ?? false,
  );
  const [preOrder, setPreOrder] = useState(product?.isPreOrder ?? false);
  // Mutually exclusive — a product cannot be both "launching soon" (no price,
  // Add to cart replaced entirely) and "orderable ahead of stock" (keeps its
  // price, Add to cart just relabelled) at once.
  function handleSetComingSoon(value: boolean) {
    setComingSoon(value);
    if (value) {
      setPreOrder(false);
    }
  }
  function handleSetPreOrder(value: boolean) {
    setPreOrder(value);
    if (value) {
      setComingSoon(false);
    }
  }
  const [refundable, setRefundable] = useState(false);
  const [warrantyEnabled, setWarrantyEnabled] = useState(
    product ? Boolean(product.warrantyLabel) : true,
  );
  // The edited product's current warranty stays selectable even when it is
  // not an active preset (deactivated, or a legacy label) — otherwise the
  // closest active preset got preselected and silently replaced it on save.
  const warrantyOptions = useMemo<ProductWarrantyOption[]>(() => {
    const current = product?.warrantyLabel?.trim();
    if (
      !current ||
      warranties.some(
        (item) => item.text.trim().toLowerCase() === current.toLowerCase(),
      )
    ) {
      return warranties;
    }
    return [
      {
        id: CURRENT_WARRANTY_OPTION_ID,
        text: current,
        badge: product?.warrantyBadge?.trim() || warrantyBadgeFromLabel(current),
        logoSrc: product?.warrantyLogoSrc ?? null,
      },
      ...warranties,
    ];
  }, [product, warranties]);
  const [warrantyOptionId, setWarrantyOptionId] = useState(
    () =>
      (product?.warrantyLabel
        ? matchWarrantyOptionId(product.warrantyLabel, warrantyOptions)
        : "") ||
      matchWarrantyOptionId("3 Year", warrantyOptions) ||
      warrantyOptions[0]?.id ||
      "",
  );
  const warrantyLabel =
    warrantyOptions.find((item) => item.id === warrantyOptionId)?.text ??
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
  // New products: picking a category fills in its PC Builder slot, so staff
  // don't have to remember to tag it. Never overrides a slot the admin chose
  // themselves (including "Not a builder part"), and never runs when editing.
  const slotTouchedRef = useRef(
    mode !== "create" || Boolean(product?.builderSlot),
  );
  function applyCategorySlotDefault(effectiveCategorySlug: string) {
    if (slotTouchedRef.current) {
      return;
    }
    setBuilderSlot(defaultSlotForCategory(effectiveCategorySlug) ?? "");
  }
  // Which compatibility fields the chosen slot actually checks (AD-346).
  const builderPicker = isBuilderSlotId(builderSlot)
    ? {
        slotId: builderSlot,
        fields: SLOT_ATTRIBUTE_FIELDS[builderSlot] ?? [],
      }
    : null;
  const [thumbnailSrc, setThumbnailSrc] = useState(
    product?.image.src && product.image.src !== "/products/placeholder.svg"
      ? product.image.src
      : "",
  );
  // Every image after the thumbnail (index 0), in display order (AD-370).
  const [galleryImages, setGalleryImages] = useState<string[]>(() =>
    (product?.images ?? [])
      .slice(1)
      .map((image) => image.src)
      .filter((src) => src && src !== "/products/placeholder.svg"),
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
          overviewHtml,
          detailsHtml,
          metaTitle,
          metaDescription,
          quantity: stockQty,
          lowStockThreshold: lowStockWarning ? lowStockQty : "0",
          isActive: publish,
          isNew: featured,
          isSale:
            todaysDeal ||
            (Number.parseFloat(regularPrice) >
              Number.parseFloat(specialPrice)),
          isComingSoon: comingSoon,
          isPreOrder: preOrder,
          warrantyEnabled,
          warrantyLabel,
          // The synthetic "current" option has no row id; its label resolves
          // it server-side instead.
          warrantyId:
            warrantyOptionId === CURRENT_WARRANTY_OPTION_ID
              ? undefined
              : warrantyOptionId,
          noteIds,
          labelIds,
          barcode,
          modelNumber,
          relatedProductIds: relatedProducts.map((item) => item.id),
          ...variantFormToInput(variantForm),
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
          gallerySrcs: galleryImages,
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
          {/* The form also has Save & publish at the bottom, after every field —
              this top copy is for a long product with lots of fields, so saving
              never needs a scroll back down (AD-370). Same submit, same result. */}
          <Button
            type="submit"
            disabled={pending || !canSave}
            size="sm"
            className="min-h-9 bg-emerald-600 px-4 hover:bg-emerald-700"
          >
            {pending ? "Saving…" : "Save & publish"}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          {(() => {
            const sectionNodes: Record<ProductFormSectionId, ReactNode> = {
            basic_info: (
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
                <AdminSearchableSelect
                  id="product-category"
                  value={categorySlug}
                  onChange={(next) => {
                    setCategorySlug(next);
                    setSubcategorySlug("");
                    applyCategorySlotDefault(next);
                  }}
                  options={rootCategoryOptions}
                  placeholder="Select main category"
                  searchPlaceholder="Search categories…"
                  noMatchText="No category matches"
                  disabled={pending}
                />
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
                  {sortedBrands.map((brand) => (
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
                <AdminSearchableSelect
                  id="product-subcategory"
                  value={subcategorySlug}
                  onChange={(next) => {
                    setSubcategorySlug(next);
                    applyCategorySlotDefault(next || categorySlug);
                  }}
                  options={subcategoryOptions}
                  placeholder="Use main category"
                  emptyOptionLabel="Use main category"
                  searchPlaceholder="Search subcategories…"
                  noMatchText="No subcategory matches"
                  disabled={pending}
                />
                <p className="text-xs text-neutral-500">
                  The product is filed under this category on the storefront.
                </p>
              </div>
            ) : null}
          </AdminFormCard>
            ),
            configuration: (
          <AdminFormCard title="Product configuration">
            <div className="space-y-1.5">
              <AdminFormLabel required>Related categories</AdminFormLabel>
              <p className="text-xs text-neutral-500">
                Extra category links are not stored yet. The subcategory above
                is the product&apos;s category.
              </p>
              <AdminSearchableSelect
                id="product-related-category"
                value={relatedCategorySlug}
                onChange={setRelatedCategorySlug}
                options={allCategoryOptions}
                placeholder="Nothing selected"
                emptyOptionLabel="Nothing selected"
                searchPlaceholder="Search categories…"
                noMatchText="No category matches"
              />
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
                    {warrantyOptions.map((item) => (
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
              <AdminFormLabel htmlFor="product-model-number">
                Model number
              </AdminFormLabel>
              <Input
                id="product-model-number"
                value={modelNumber}
                onChange={(event) => setModelNumber(event.target.value)}
                maxLength={PRODUCT_MODEL_NUMBER_MAX}
                placeholder="e.g. TH-TP400"
                className={adminFormControlClass}
              />
              <p className="text-xs text-neutral-500">
                Shown on the product page next to SKU and brand. Leave blank
                to hide it.
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
            ),
            files_media: (
          <AdminFormCard title="Files & media">
            <p className="text-xs text-neutral-500">
              Click a box to open the media library — upload from your PC or
              choose an existing file, then Save.
            </p>
            <div className="max-w-40">
              <AdminFormUploadBox
                label="Add thumbnail image"
                sizeHint="300px × 300px — the cover image"
                previewSrc={thumbnailSrc || product?.image.src}
                previewAlt={product?.image.alt ?? product?.name ?? ""}
                value={thumbnailSrc}
                onChange={setThumbnailSrc}
                folder="products"
              />
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel>Gallery images</AdminFormLabel>
              <AdminProductGalleryFields
                images={galleryImages}
                onChange={setGalleryImages}
                productName={name || "Product"}
                disabled={pending}
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
            ),
            quick_overview: (
          <AdminFormCard title="Quick overview">
            <p className="text-xs text-neutral-500">
              Shown in the buy box, right under the price. Keep it short — a
              few highlights, not the full spec sheet (that&apos;s
              Specifications) — a long one pushes the Add to cart row down.
            </p>
            <RichTextEditor
              value={overviewHtml}
              onChange={setOverviewHtml}
              disabled={pending}
              placeholder="A few short highlights…"
            />
          </AdminFormCard>
            ),
            details: (
          <AdminFormCard title="Details">
            <p className="text-xs text-neutral-500">
              Shown in the &quot;Details&quot; tab below the gallery. Independent of
              Quick overview and Specifications — write it fresh, it is
              never derived from either.
            </p>
            <RichTextEditor
              value={detailsHtml}
              onChange={setDetailsHtml}
              disabled={pending}
              placeholder="Longer-form details about this product…"
            />
          </AdminFormCard>
            ),
            seo: (
          <AdminFormCard title="SEO meta tags">
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="seo-title">Meta title</AdminFormLabel>
              <Input
                id="seo-title"
                value={metaTitle}
                onChange={(event) => setMetaTitle(event.target.value)}
                placeholder={seoSuggestion?.title ?? "Meta title"}
                maxLength={100}
                className={adminFormControlClass}
              />
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={cn(
                    "tabular-nums",
                    metaTitle.trim().length > SEO_TITLE_MAX
                      ? "font-medium text-red-600"
                      : "text-neutral-500",
                  )}
                >
                  {metaTitle.trim().length} / {SEO_TITLE_MAX}
                </span>
                {seoSuggestion ? (
                  <button
                    type="button"
                    className="text-blue-600 hover:underline disabled:opacity-50"
                    disabled={pending}
                    onClick={() => setMetaTitle(seoSuggestion.title)}
                  >
                    Use suggestion
                  </button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="seo-description">
                Description
              </AdminFormLabel>
              <Textarea
                id="seo-description"
                rows={4}
                value={metaDescription}
                onChange={(event) => setMetaDescription(event.target.value)}
                placeholder={seoSuggestion?.metaDescription ?? "Meta description"}
                maxLength={200}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={cn(
                    "tabular-nums",
                    metaDescription.trim().length > SEO_DESC_MAX
                      ? "font-medium text-red-600"
                      : "text-neutral-500",
                  )}
                >
                  {metaDescription.trim().length} / {SEO_DESC_MAX}
                </span>
                {seoSuggestion ? (
                  <button
                    type="button"
                    className="text-blue-600 hover:underline disabled:opacity-50"
                    disabled={pending}
                    onClick={() => setMetaDescription(seoSuggestion.metaDescription)}
                  >
                    Use suggestion
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-neutral-500">
                Left empty, the product page uses the standard title and
                description. Text saved here is used exactly as typed
                {product?.seoSource === "generated"
                  ? " (currently generated by the SEO tool; editing it marks it as hand-written)"
                  : product?.seoSource === "admin"
                    ? " (hand-written)"
                    : ""}
                .
              </p>
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
            ),
            price_stock: (
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
                  disabled={variantsDrivePricing}
                  required
                />
                <p className="text-xs text-neutral-500">
                  {variantsDrivePricing
                    ? "Set by the variants below — the lowest active variant price."
                    : "Price customers pay (storefront “Special price”)."}
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
                  disabled={variantsDrivePricing}
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
                  title={
                    variantsDrivePricing
                      ? "The total of the variants' stock"
                      : undefined
                  }
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
                  disabled={pending || variantsDrivePricing}
                />
                <p className="text-xs text-neutral-500">
                  {variantsDrivePricing
                    ? "The total of the variants' stock. "
                    : ""}
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
                  disabled={pending || variantsDrivePricing}
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
            ),
            b2b_pricing: (
          <AdminFormCard title="B2B / Wholesale pricing">
            {mode === "edit" && product ? (
              <AdminProductB2BFields
                productId={product.id}
                retailAmount={
                  Number.parseInt(specialPrice.replace(/,/g, ""), 10) ||
                  product.price.amount
                }
                initial={b2bTerms}
              />
            ) : (
              <p className="text-xs text-neutral-500">
                Save the product first to enable B2B / wholesale pricing.
              </p>
            )}
          </AdminFormCard>
            ),
            pc_builder: (
          <AdminFormCard title="PC Builder">
            <p className="text-xs text-neutral-500">
              Assign this product to one builder slot. Leave empty if it is not
              a PC part. Then tick what it is compatible with — a part can
              support several values (e.g. a board that takes both DDR4 and
              DDR5). The PC Builder only suggests parts whose values match what
              the customer already picked, so parts with nothing ticked are
              hidden by default.
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
                  slotTouchedRef.current = true;
                  setBuilderSlot(next);
                  // Drop values the new slot never checks, so nothing hidden
                  // is silently saved against the wrong kind of part.
                  const keep: readonly BuilderAttrField[] = isBuilderSlotId(next)
                    ? (SLOT_ATTRIBUTE_FIELDS[next] ?? [])
                    : [];
                  if (!keep.includes("socket")) setBuilderSocket("");
                  if (!keep.includes("ramType")) setBuilderRamType("");
                  if (!keep.includes("formFactor")) setBuilderFormFactor("");
                  if (!keep.includes("tdpWatts")) setBuilderTdpWatts("");
                  if (!keep.includes("storageInterface")) {
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
            {builderPicker && builderPicker.fields.length === 0 ? (
              <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                This slot has no compatibility rules, so there is nothing to
                tick — customers can pick it freely.
              </p>
            ) : null}
            {builderPicker && builderPicker.fields.length > 0 ? (
              <div className="space-y-5">
                {builderPicker.fields.includes("socket") ? (
                  <AdminBuilderMultiSelect
                    key={`socket-${builderSlot}`}
                    id="builder-socket"
                    {...builderAttributeCopy(builderPicker.slotId, "socket")}
                    value={builderSocket}
                    onChange={setBuilderSocket}
                    options={SOCKET_OPTIONS}
                    otherPlaceholder="LGA1851"
                    disabled={pending}
                  />
                ) : null}
                {builderPicker.fields.includes("ramType") ? (
                  <AdminBuilderMultiSelect
                    key={`ram-${builderSlot}`}
                    id="builder-ram"
                    {...builderAttributeCopy(builderPicker.slotId, "ramType")}
                    value={builderRamType}
                    onChange={setBuilderRamType}
                    options={RAM_TYPE_OPTIONS}
                    otherPlaceholder="LPDDR5"
                    disabled={pending}
                  />
                ) : null}
                {builderPicker.fields.includes("formFactor") ? (
                  <AdminBuilderMultiSelect
                    key={`form-${builderSlot}`}
                    id="builder-form"
                    {...builderAttributeCopy(builderPicker.slotId, "formFactor")}
                    value={builderFormFactor}
                    onChange={setBuilderFormFactor}
                    options={FORM_FACTOR_OPTIONS}
                    otherPlaceholder="Thin Mini-ITX"
                    disabled={pending}
                  />
                ) : null}
                {builderPicker.fields.includes("storageInterface") ? (
                  <AdminBuilderMultiSelect
                    key={`storage-${builderSlot}`}
                    id="builder-storage-interface"
                    {...builderAttributeCopy(builderPicker.slotId, "storageInterface")}
                    value={builderStorageInterface}
                    onChange={setBuilderStorageInterface}
                    options={STORAGE_INTERFACE_OPTIONS}
                    otherPlaceholder="SAS"
                    disabled={pending}
                  />
                ) : null}
                {builderPicker.fields.includes("tdpWatts") ? (
                  <div className="max-w-xs space-y-1.5">
                    <AdminFormLabel
                      htmlFor="builder-tdp"
                      hint={builderAttributeCopy(builderPicker.slotId, "tdpWatts").hint}
                    >
                      {builderAttributeCopy(builderPicker.slotId, "tdpWatts").label}
                    </AdminFormLabel>
                    <Input
                      id="builder-tdp"
                      inputMode="numeric"
                      value={builderTdpWatts}
                      onChange={(event) =>
                        setBuilderTdpWatts(event.target.value)
                      }
                      placeholder="65"
                      className={adminFormControlClass}
                      disabled={pending}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </AdminFormCard>
            ),
            variants: (
          <AdminFormCard title="Variants">
            <AdminProductVariantsFields
              value={variantForm}
              onChange={setVariantForm}
              productName={name}
              productSku={sku}
              defaultPrice={specialPriceInput}
              disabled={pending}
            />
          </AdminFormCard>
            ),
            labels: (
          <AdminFormCard title="Labels">
            <AdminProductLabelsFields
              labels={labels}
              selectedIds={labelIds}
              onChange={setLabelIds}
            />
          </AdminFormCard>
            ),
            notes: (
          <AdminFormCard title="Notes">
            <AdminProductNotesFields
              notes={notes}
              selectedIds={noteIds}
              onChange={setNoteIds}
            />
          </AdminFormCard>
            ),
            promotions:
              mode === "edit" && product?.id && promotions ? (
            <AdminFormCard title="Promotions">
              <AdminProductPromotionsFields
                productId={product.id}
                promotions={promotions}
                assignedPromotionIds={assignedPromotionIds}
                canManage={canManagePromotions}
              />
            </AdminFormCard>
          ) : null,
            specifications: (
          <AdminFormCard title="Specifications">
            <AdminProductSpecGroupsFields
              groups={specGroupSections}
              onChange={setSpecGroupSections}
            />
          </AdminFormCard>
            ),
            };
            return sectionOrder.map((id) => (
              <Fragment key={id}>{sectionNodes[id]}</Fragment>
            ));
          })()}
        </div>

        <AdminProductFormSidebar
          published={published}
          setPublished={setPublished}
          featured={featured}
          setFeatured={setFeatured}
          todaysDeal={todaysDeal}
          setTodaysDeal={setTodaysDeal}
          comingSoon={comingSoon}
          setComingSoon={handleSetComingSoon}
          preOrder={preOrder}
          setPreOrder={handleSetPreOrder}
          refundable={refundable}
          setRefundable={setRefundable}
          warrantyEnabled={warrantyEnabled}
          setWarrantyEnabled={setWarrantyEnabled}
          warranties={warrantyOptions}
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
              extraBrandSlugs: [],
            },
          ]);
          setCategorySlug(category.slug);
          setSubcategorySlug("");
          applyCategorySlotDefault(category.slug);
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

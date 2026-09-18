"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminMediaImageField } from "@/features/admin/media/admin-media-picker";
import { saveAdminBrandAction } from "@/features/admin/brands/brand-actions";
import type { AdminBrandRow } from "@/lib/admin/brands-admin-mock";
import {
  BRAND_DESCRIPTION_MAX,
  BRAND_NAME_MAX,
  slugifyBrand,
} from "@/lib/catalog/brand-input";

type FormMode = "create" | "edit";

const PLACEHOLDER_LOGO = "/products/placeholder.svg";

function initialLogoSrc(brand?: AdminBrandRow | null): string {
  const src = brand?.logoSrc?.trim() ?? "";
  if (!src || src === PLACEHOLDER_LOGO) {
    return "";
  }
  return src;
}

export function AdminBrandForm({
  mode,
  brand,
  canSave,
}: {
  mode: FormMode;
  brand?: AdminBrandRow | null;
  canSave: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [position, setPosition] = useState(
    brand ? String(brand.position) : "0",
  );
  const [metaTitle, setMetaTitle] = useState(brand?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    brand?.metaDescription ?? "",
  );
  const [metaKeywords, setMetaKeywords] = useState(
    brand ? brand.name.toLowerCase() : "",
  );
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const [logoSrc, setLogoSrc] = useState(initialLogoSrc(brand));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!canSave) {
      setError("You do not have permission to save brands.");
      return;
    }

    startTransition(async () => {
      const result = await saveAdminBrandAction({
        currentSlug: mode === "edit" ? brand?.slug : undefined,
        fields: {
          name,
          slug,
          position,
          description: metaDescription,
          isActive,
          logoSrc,
        },
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the brand.");
        return;
      }
      notifySuccess(mode === "create" ? "Brand created" : "Brand saved");
      router.refresh();
      if (mode === "create" || result.slug !== brand?.slug) {
        router.push(`/admin/brands/${result.slug}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <p className="text-sm text-neutral-500">
          <Link href="/admin/brands" className="hover:underline">
            Brands
          </Link>
          <span className="mx-1.5">/</span>
          {mode === "create" ? "Add new" : "Edit"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
          {mode === "create" ? "Add new brand" : "Edit brand"}
        </h1>
        {mode === "edit" && brand ? (
          <p className="mt-1 text-body text-text-muted">{brand.name}</p>
        ) : null}
      </div>

      <AdminFormCard title="Brand information">
        {error ? (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="brand-name" required>
            Name
          </AdminFormLabel>
          <Input
            id="brand-name"
            value={name}
            maxLength={BRAND_NAME_MAX}
            onChange={(event) => {
              const next = event.target.value;
              setName(next);
              if (mode === "create" && (!slug || slug === slugifyBrand(name))) {
                setSlug(slugifyBrand(next));
              }
            }}
            className={adminFormControlClass}
            disabled={pending}
            required
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="brand-slug" required>
            URL slug
          </AdminFormLabel>
          <Input
            id="brand-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
            required
          />
          <p className="text-xs text-neutral-500">
            Storefront path: /brand/{slug || "…"}
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="brand-position">
            Ordering number
          </AdminFormLabel>
          <Input
            id="brand-position"
            inputMode="numeric"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="size-4 rounded border-border accent-[#3897f0]"
            disabled={pending}
          />
          Visible on the storefront
        </label>

        <AdminMediaImageField
          label="Logo (160×48)"
          value={logoSrc}
          onChange={setLogoSrc}
          disabled={pending || !canSave}
          folder="brands"
          pickerTitle="Brand logo"
          hint="Shown at 160px × 48px on the storefront. Upload from your PC or choose a file already in the media library, then Save."
        />

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="meta-title">Meta title</AdminFormLabel>
          <Input
            id="meta-title"
            placeholder="Meta title"
            value={metaTitle}
            onChange={(event) => setMetaTitle(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">
            Not stored on the brand record yet.
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="meta-description">
            Description
          </AdminFormLabel>
          <Textarea
            id="meta-description"
            rows={4}
            maxLength={BRAND_DESCRIPTION_MAX}
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">
            Stored as the brand description.
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="meta-keywords">Meta keywords</AdminFormLabel>
          <Input
            id="meta-keywords"
            placeholder="Keyword, Keyword"
            value={metaKeywords}
            onChange={(event) => setMetaKeywords(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">
            Separate with comma. Not stored on the brand record yet.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/admin/brands"
            className={buttonClassName({
              variant: "ghost",
              className: "border border-neutral-200",
            })}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
            disabled={pending || !canSave}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </AdminFormCard>
    </form>
  );
}

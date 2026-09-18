"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import {
  DashedUpload,
  Field,
  Input,
  StudioBackLink,
  StudioCard,
  Textarea,
  controlClass,
} from "@/features/admin/design-studio/studio-ui";
import {
  deleteHomeBannerAction,
  saveHomeBannerAction,
  uploadBannerImageAction,
} from "@/features/admin/design-studio/banner-actions";

/** Mirrors AdminHomeBanner in lib/design/home-banners.ts (server-only, not importable from a client component). */
type AdminHomeBannerProp = {
  id: string;
  slot: "hero" | "hero-side" | "flash-wide" | "promo-tile" | "category";
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  position: number;
  isActive: boolean;
};

const EMPTY_DRAFT = {
  eyebrow: "",
  title: "",
  text: "",
  cta: "",
  href: "/",
  imageSrc: "",
  imageAlt: "",
  isActive: true,
};

function BannerForm({
  slot,
  banner,
  position,
  onSaved,
  onCancel,
}: {
  slot: "hero" | "hero-side" | "flash-wide" | "promo-tile";
  banner: AdminHomeBannerProp | null;
  position: number;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(
    banner
      ? {
          eyebrow: banner.eyebrow,
          title: banner.title,
          text: banner.text,
          cta: banner.cta,
          href: banner.href,
          imageSrc: banner.imageSrc,
          imageAlt: banner.imageAlt,
          isActive: banner.isActive,
        }
      : EMPTY_DRAFT,
  );

  function save() {
    startTransition(async () => {
      const result = await saveHomeBannerAction({
        id: banner?.id,
        slot,
        ...draft,
        position,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(banner ? "Banner updated — live on the storefront" : "Banner created — live on the storefront");
      onSaved();
    });
  }

  const sizeHint: Record<typeof slot, string> = {
    hero: "Recommended 1200px × 580px (roughly 2:1). Uploads immediately.",
    "hero-side": "Recommended 600px × 290px (roughly 2:1). Uploads immediately.",
    "flash-wide":
      "Recommended 1370px × 242px on desktop (crops to 400×184 on mobile). Uploads immediately.",
    "promo-tile": "Recommended 800px × 230px, wide tile. Uploads immediately.",
  };

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 p-4">
      <Field label="Image" required hint={sizeHint[slot]}>
        <DashedUpload
          previewSrc={draft.imageSrc || null}
          disabled={pending}
          onFile={(file) => {
            startTransition(async () => {
              const formData = new FormData();
              formData.set("file", file);
              const result = await uploadBannerImageAction(formData);
              if (!result.ok) {
                notifyError(result.formError);
                return;
              }
              if (result.path) {
                setDraft((prev) => ({ ...prev, imageSrc: result.path! }));
              }
            });
          }}
        />
      </Field>
      <Field label="Eyebrow" hint="Small label above the title, e.g. “Flash deal”.">
        <Input
          value={draft.eyebrow}
          onChange={(e) => setDraft((prev) => ({ ...prev, eyebrow: e.target.value }))}
          className={controlClass}
        />
      </Field>
      <Field label="Title" required>
        <Input
          value={draft.title}
          onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          className={controlClass}
        />
      </Field>
      <Field label="Text" hint="Optional supporting line (hidden on small screens for tiles).">
        <Textarea
          rows={2}
          value={draft.text}
          onChange={(e) => setDraft((prev) => ({ ...prev, text: e.target.value }))}
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Call-to-action label" required>
        <Input
          value={draft.cta}
          onChange={(e) => setDraft((prev) => ({ ...prev, cta: e.target.value }))}
          className={controlClass}
        />
      </Field>
      <Field label="Link" required hint="A real storefront path, e.g. /flash-sale">
        <Input
          value={draft.href}
          onChange={(e) => setDraft((prev) => ({ ...prev, href: e.target.value }))}
          className={controlClass}
        />
      </Field>
      <Field label="Image alt text" hint="Defaults to the title if left blank.">
        <Input
          value={draft.imageAlt}
          onChange={(e) => setDraft((prev) => ({ ...prev, imageAlt: e.target.value }))}
          className={controlClass}
        />
      </Field>
      <div className="flex items-center gap-3">
        <AdminToggleSwitch
          label="Active on storefront"
          checked={draft.isActive}
          onChange={(value) => setDraft((prev) => ({ ...prev, isActive: value }))}
        />
        <span className="text-sm text-neutral-700">Active on storefront</span>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : banner ? "Save banner" : "Add banner"}
        </button>
      </div>
    </div>
  );
}

function BannerRow({
  banner,
  onEdit,
  onDeleted,
}: {
  banner: AdminHomeBannerProp;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin preview only */}
      <img
        src={banner.imageSrc}
        alt=""
        className="size-14 shrink-0 rounded-md border border-neutral-100 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{banner.title}</p>
        <p className="truncate text-xs text-neutral-500">
          {banner.href} · {banner.isActive ? "Active" : "Hidden"}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Edit
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete "${banner.title}"? This can't be undone.`)) {
            return;
          }
          startTransition(async () => {
            const result = await deleteHomeBannerAction(banner.id);
            if (!result.ok) {
              notifyError(result.formError);
              return;
            }
            notifySuccess("Banner deleted");
            onDeleted();
          });
        }}
        className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
        aria-label="Delete banner"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function AdminBannersPage({
  banners,
}: {
  banners: AdminHomeBannerProp[];
}) {
  const router = useRouter();
  const [addingHero, setAddingHero] = useState(false);
  const [addingHeroSide, setAddingHeroSide] = useState(false);
  const [addingFlash, setAddingFlash] = useState(false);
  const [addingTile, setAddingTile] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const heroBanners = banners.filter((b) => b.slot === "hero");
  const heroSideBanners = banners.filter((b) => b.slot === "hero-side");
  const flashBanners = banners.filter((b) => b.slot === "flash-wide");
  const tileBanners = banners.filter((b) => b.slot === "promo-tile");
  function refresh() {
    setAddingHero(false);
    setAddingHeroSide(false);
    setAddingFlash(false);
    setAddingTile(false);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Banners & Sliders
        </h1>
        <div className="mt-1">
          <StudioBackLink />
        </div>
      </div>

      <StudioCard
        title="Hero slider"
        hint="Real — the big rotating slider at the very top of the homepage. Add 2 or more slides to enable auto-rotate and arrows; with one slide it shows as a single static banner. Hidden entirely until at least one slide is added."
        onUpdate={() => setAddingHero(true)}
        updateLabel={heroBanners.length > 0 ? "Add another slide" : "Add slide"}
      >
        {heroBanners.map((banner) =>
          editingId === banner.id ? (
            <BannerForm
              key={banner.id}
              slot="hero"
              banner={banner}
              position={banner.position}
              onSaved={refresh}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <BannerRow
              key={banner.id}
              banner={banner}
              onEdit={() => setEditingId(banner.id)}
              onDeleted={refresh}
            />
          ),
        )}
        {heroBanners.length === 0 && !addingHero ? (
          <p className="text-sm text-neutral-400">
            No hero slides yet — the homepage slider is hidden until one is added.
          </p>
        ) : null}
        {addingHero ? (
          <BannerForm
            slot="hero"
            banner={null}
            position={heroBanners.length}
            onSaved={refresh}
            onCancel={() => setAddingHero(false)}
          />
        ) : null}
      </StudioCard>

      <StudioCard
        title="Hero side images"
        hint="Real — the 2 stacked images beside the hero slider on the homepage. Only the first 2 active images show, top to bottom. Hidden entirely until at least one is added."
        onUpdate={() => setAddingHeroSide(true)}
        updateLabel={heroSideBanners.length > 0 ? "Add another image" : "Add image"}
      >
        {heroSideBanners.map((banner) =>
          editingId === banner.id ? (
            <BannerForm
              key={banner.id}
              slot="hero-side"
              banner={banner}
              position={banner.position}
              onSaved={refresh}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <BannerRow
              key={banner.id}
              banner={banner}
              onEdit={() => setEditingId(banner.id)}
              onDeleted={refresh}
            />
          ),
        )}
        {heroSideBanners.length === 0 && !addingHeroSide ? (
          <p className="text-sm text-neutral-400">
            No side images yet — that column is hidden until one is added.
          </p>
        ) : null}
        {addingHeroSide ? (
          <BannerForm
            slot="hero-side"
            banner={null}
            position={heroSideBanners.length}
            onSaved={refresh}
            onCancel={() => setAddingHeroSide(false)}
          />
        ) : null}
      </StudioCard>

      <StudioCard
        title="Flash Deal"
        hint="Real — the wide strip shown under Top categories on the homepage. Only the first active banner shows."
        onUpdate={() => setAddingFlash(true)}
        updateLabel={flashBanners.length > 0 ? "Add another" : "Add banner"}
      >
        {flashBanners.map((banner) =>
          editingId === banner.id ? (
            <BannerForm
              key={banner.id}
              slot="flash-wide"
              banner={banner}
              position={banner.position}
              onSaved={refresh}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <BannerRow
              key={banner.id}
              banner={banner}
              onEdit={() => setEditingId(banner.id)}
              onDeleted={refresh}
            />
          ),
        )}
        {flashBanners.length === 0 && !addingFlash ? (
          <p className="text-sm text-neutral-400">
            No flash banner yet — the homepage strip is hidden until one is added.
          </p>
        ) : null}
        {addingFlash ? (
          <BannerForm
            slot="flash-wide"
            banner={null}
            position={flashBanners.length}
            onSaved={refresh}
            onCancel={() => setAddingFlash(false)}
          />
        ) : null}
      </StudioCard>

      <StudioCard
        title="Today's deal & offer tiles"
        hint="Real — the paired promotional strips between product rails on the homepage."
        onUpdate={() => setAddingTile(true)}
        updateLabel="Add tile"
      >
        {tileBanners.map((banner) =>
          editingId === banner.id ? (
            <BannerForm
              key={banner.id}
              slot="promo-tile"
              banner={banner}
              position={banner.position}
              onSaved={refresh}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <BannerRow
              key={banner.id}
              banner={banner}
              onEdit={() => setEditingId(banner.id)}
              onDeleted={refresh}
            />
          ),
        )}
        {tileBanners.length === 0 && !addingTile ? (
          <p className="text-sm text-neutral-400">
            No promo tiles yet — that homepage section is hidden until at least one is added.
          </p>
        ) : null}
        {addingTile ? (
          <BannerForm
            slot="promo-tile"
            banner={null}
            position={tileBanners.length}
            onSaved={refresh}
            onCancel={() => setAddingTile(false)}
          />
        ) : null}
      </StudioCard>
    </div>
  );
}

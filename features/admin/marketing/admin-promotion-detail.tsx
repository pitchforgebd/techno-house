"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { AdminMediaImageField } from "@/features/admin/media/admin-media-picker";
import { savePromotionAction } from "@/features/admin/promotions/promotion-actions";
import { CampaignStatusBadge } from "@/features/admin/marketing/admin-marketing-badges";
import type {
  AdminPromotion,
  CampaignStatus,
} from "@/lib/admin/marketing-mock";

export function AdminPromotionDetail({
  promotion,
  isNew,
}: {
  promotion: AdminPromotion | null;
  isNew?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(promotion?.name ?? "");
  const [slug, setSlug] = useState(promotion?.slug ?? "");
  const [status, setStatus] = useState<CampaignStatus>(
    promotion?.status ?? "draft",
  );
  const [channel, setChannel] = useState<AdminPromotion["channel"]>(
    promotion?.channel ?? "homepage",
  );
  const [startsAt, setStartsAt] = useState(promotion?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(promotion?.endsAt ?? "");
  const [summary, setSummary] = useState(promotion?.summary ?? "");
  const [priority, setPriority] = useState(String(promotion?.priority ?? 5));
  const [bannerSrc, setBannerSrc] = useState(promotion?.bannerSrc ?? "");
  const [bannerLabel, setBannerLabel] = useState(promotion?.bannerLabel ?? "");
  const [bannerHref, setBannerHref] = useState(promotion?.bannerHref ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await savePromotionAction({
        id: isNew ? undefined : promotion?.id,
        name,
        slug,
        status,
        channel,
        startsAt,
        endsAt,
        summary,
        priority,
        bannerSrc,
        bannerLabel,
        bannerHref,
      });
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      notifySuccess(isNew ? "Promotion created" : "Promotion saved");
      router.refresh();
      if (isNew) {
        router.push(`/admin/promotions/${result.id}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-medium text-primary">
            <Link
              href="/admin/promotions/campaigns"
              className="hover:underline"
            >
              Campaigns
            </Link>
            <span className="text-text-muted"> / </span>
            {isNew ? "New promotion" : promotion?.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {isNew ? "Create promotion" : promotion?.name}
          </h1>
        </div>
        {!isNew && promotion ? (
          <CampaignStatusBadge status={promotion.status} />
        ) : (
          <Badge tone="neutral">draft</Badge>
        )}
      </div>

      {formError ? (
        <Alert tone="danger" title="Could not save">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      <form
        className="space-y-4 rounded-md border border-border bg-surface p-4"
        onSubmit={handleSubmit}
      >
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">Slug</span>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Status
            </span>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as CampaignStatus)}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Channel
            </span>
            <Select
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as AdminPromotion["channel"])
              }
            >
              <option value="homepage">Homepage</option>
              <option value="category">Category</option>
              <option value="sitewide">Sitewide</option>
            </Select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Starts
            </span>
            <Input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Ends
            </span>
            <Input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Priority (1–10)
          </span>
          <Input
            type="number"
            min={1}
            max={10}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Summary
          </span>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
          />
        </label>
        <div className="space-y-4 border-t border-border pt-5">
          <div>
            <p className="text-body font-semibold text-text">Offer banner</p>
            <p className="mt-0.5 text-caption text-text-muted">
              Shown on the public Offers page. The artwork carries the whole
              message — there is no caption under it.
            </p>
          </div>

          <AdminMediaImageField
            label="Banner artwork"
            value={bannerSrc}
            onChange={setBannerSrc}
            disabled={pending}
            folder="promotions"
            pickerTitle="Offer banner"
            hint="Recommended 800px × 400px, wide artwork (roughly 2:1). Without one this campaign does not appear on /offers."
          />

          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Banner label
            </span>
            <Input
              value={bannerLabel}
              onChange={(e) => setBannerLabel(e.target.value)}
              maxLength={28}
              placeholder="MONITOR"
            />
            <span className="block text-caption text-text-muted">
              Runs vertically down the left edge of the banner. Falls back to
              the channel when empty.
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Banner link
            </span>
            <Input
              value={bannerHref}
              onChange={(e) => setBannerHref(e.target.value)}
              placeholder="/category/monitors"
            />
            <span className="block text-caption text-text-muted">
              Local storefront path only, starting with /. Leave empty to make
              the banner non-clickable.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save promotion"}
          </Button>
          <Link
            href="/admin/promotions/campaigns"
            className={buttonClassName({ variant: "secondary" })}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

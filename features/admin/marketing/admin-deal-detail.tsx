"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CampaignStatusBadge } from "@/features/admin/marketing/admin-marketing-badges";
import type { AdminDeal, CampaignStatus } from "@/lib/admin/marketing-mock";

export function AdminDealDetail({
  deal,
  isNew,
}: {
  deal: AdminDeal | null;
  isNew?: boolean;
}) {
  const [name, setName] = useState(deal?.name ?? "");
  const [slug, setSlug] = useState(deal?.slug ?? "");
  const [status, setStatus] = useState<CampaignStatus>(
    deal?.status ?? "draft",
  );
  const [scope, setScope] = useState<AdminDeal["scope"]>(
    deal?.scope ?? "category",
  );
  const [scopeLabel, setScopeLabel] = useState(deal?.scopeLabel ?? "");
  const [discountLabel, setDiscountLabel] = useState(
    deal?.discountLabel ?? "",
  );
  const [startsAt, setStartsAt] = useState(deal?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(deal?.endsAt ?? "");


  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-medium text-primary">
            <Link href="/admin/deals" className="hover:underline">
              Deals
            </Link>
            <span className="text-text-muted"> / </span>
            {isNew ? "New deal" : deal?.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {isNew ? "Create deal" : deal?.name}
          </h1>
        </div>
        {!isNew && deal ? (
          <CampaignStatusBadge status={deal.status} />
        ) : (
          <Badge tone="neutral">draft</Badge>
        )}
      </div>

      <Alert tone="warning" title="Deal campaigns are not available yet">
        <p className="text-caption">
          This editor is a preview only — saving is disabled because deal
          campaigns have no storefront pricing behaviour behind them yet.
          Nothing typed here is stored.
        </p>
        <p className="mt-1 text-caption">
          To put products on offer today, use{" "}
          <Link href="/admin/deals" className="font-medium underline">
            Today&apos;s Deal
          </Link>{" "}
          or{" "}
          <Link href="/admin/flash-sales" className="font-medium underline">
            Flash deals
          </Link>
          , which are both live.
        </p>
      </Alert>

      <form
        className="space-y-4 rounded-md border border-border bg-surface p-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">Slug</span>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
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
              Scope type
            </span>
            <Select
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as AdminDeal["scope"])
              }
            >
              <option value="category">Category</option>
              <option value="brand">Brand</option>
              <option value="product">Product</option>
            </Select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Scope label
          </span>
          <Input
            value={scopeLabel}
            onChange={(e) => setScopeLabel(e.target.value)}
            placeholder="e.g. RAM, Volt, Selected laptops"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Discount label
          </span>
          <Input
            value={discountLabel}
            onChange={(e) => setDiscountLabel(e.target.value)}
            placeholder="e.g. Up to 15% off"
          />
        </label>
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
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" disabled title="Saving is not available yet">
            Save deal
          </Button>
          <Link
            href="/admin/deals"
            className={buttonClassName({ variant: "secondary" })}
          >
            Back to deals
          </Link>
          <span className="text-caption text-text-muted">
            Saving is disabled — see the notice above.
          </span>
        </div>
      </form>
    </div>
  );
}

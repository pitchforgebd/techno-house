"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { saveCouponAction } from "@/features/admin/coupons/coupon-actions";
import { CouponStatusBadge } from "@/features/admin/marketing/admin-marketing-badges";
import type {
  AdminCoupon,
  CouponAdminStatus,
} from "@/lib/admin/marketing-mock";
import { formatMoney } from "@/lib/format/currency";

export function AdminCouponForm({
  coupon,
  isNew,
}: {
  coupon: AdminCoupon | null;
  isNew?: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [kind, setKind] = useState<AdminCoupon["kind"]>(
    coupon?.kind ?? "percent",
  );
  const [value, setValue] = useState(String(coupon?.value ?? 10));
  const [label, setLabel] = useState(coupon?.label ?? "");
  const [status, setStatus] = useState<CouponAdminStatus>(
    coupon?.status ?? "active",
  );
  const [usageLimit, setUsageLimit] = useState(
    coupon?.usageLimit != null ? String(coupon.usageLimit) : "",
  );
  const [perUserLimit, setPerUserLimit] = useState(
    coupon?.perUserLimit != null ? String(coupon.perUserLimit) : "",
  );
  const [minSpend, setMinSpend] = useState(
    coupon?.minSpend != null ? String(coupon.minSpend.amount) : "",
  );
  const [startsAt, setStartsAt] = useState(coupon?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(coupon?.endsAt ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await saveCouponAction({
        id: isNew ? undefined : coupon?.id,
        code,
        kind,
        value,
        label,
        status,
        usageLimit,
        perUserLimit,
        minSpend,
        startsAt,
        endsAt,
      });
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      notifySuccess(isNew ? "Coupon created" : "Coupon saved");
      router.refresh();
      if (isNew) {
        router.push(`/admin/coupons/${result.id}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-medium text-primary">
            <Link href="/admin/coupons" className="hover:underline">
              Coupons
            </Link>
            <span className="text-text-muted"> / </span>
            {isNew ? "New coupon" : coupon?.code}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {isNew ? "Create coupon" : coupon?.code}
          </h1>
          {!isNew && coupon ? (
            <p className="mt-1 text-body text-text-muted">{coupon.label}</p>
          ) : null}
        </div>
        {!isNew && coupon ? <CouponStatusBadge status={coupon.status} /> : null}
      </div>

      {formError ? (
        <Alert tone="danger" title="Could not save">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      {!isNew && coupon ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-caption text-text-muted">Usage</p>
            <p className="mt-1 tabular-nums text-2xl font-semibold text-text">
              {coupon.usageCount}
              {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ""}
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-caption text-text-muted">Min spend</p>
            <p className="mt-1 text-2xl font-semibold text-text">
              {coupon.minSpend ? formatMoney(coupon.minSpend) : "None"}
            </p>
          </div>
        </div>
      ) : null}

      <form
        className="space-y-4 rounded-md border border-border bg-surface p-4"
        onSubmit={handleSubmit}
      >
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">Code</span>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={32}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Label
          </span>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Kind
            </span>
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as AdminCoupon["kind"])}
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Value
            </span>
            <Input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Status
            </span>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as CouponAdminStatus)}
            >
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="disabled">Disabled</option>
              <option value="expired">Expired</option>
            </Select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Usage limit (optional)
            </span>
            <Input
              type="number"
              min={0}
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Unlimited"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Per-customer limit (optional)
            </span>
            <Input
              type="number"
              min={0}
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(e.target.value)}
              placeholder="Unlimited"
            />
            <span className="block text-caption text-text-muted">
              How many times one customer may use this coupon. Leave blank for
              no limit — the usage limit above caps the total across everyone,
              not per person.
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Min spend (optional)
            </span>
            <Input
              type="number"
              min={0}
              value={minSpend}
              onChange={(e) => setMinSpend(e.target.value)}
            />
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
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save coupon"}
          </Button>
          <Link
            href="/admin/coupons"
            className={buttonClassName({ variant: "secondary" })}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

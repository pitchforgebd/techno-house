"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { BadgeCheck, Clock, ShieldAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { updateB2BProfileAction } from "@/features/b2b/b2b-actions";
import type { MyB2BProfile } from "@/lib/b2b/applications";

const STATUS_COPY = {
  PENDING: {
    tone: "neutral" as const,
    label: "Verification pending",
    Icon: Clock,
    note: "An admin is reviewing your business details. Retail prices apply until the account is verified.",
  },
  ACTIVE: {
    tone: "stock" as const,
    label: "Verified",
    Icon: BadgeCheck,
    note: "Wholesale prices and order minimums are active across the store.",
  },
  SUSPENDED: {
    tone: "sale" as const,
    label: "Suspended",
    Icon: ShieldAlert,
    note: "Wholesale pricing is paused on this account. Contact support to restore it.",
  },
};

export function B2BProfileView({ profile }: { profile: MyB2BProfile }) {
  const [company, setCompany] = useState(profile.company);
  const [contactName, setContactName] = useState(profile.contactName);
  const [shopAddress, setShopAddress] = useState(profile.shopAddress ?? "");
  const [pending, startTransition] = useTransition();

  const status = STATUS_COPY[profile.status];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateB2BProfileAction({
        company,
        contactName,
        shopAddress,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Wholesale profile updated");
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
              <status.Icon aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-label font-semibold text-text">
                {profile.company}
              </p>
              <p className="text-caption text-text-muted">
                Wholesale account status
              </p>
            </div>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="mt-3 text-caption text-text-muted">{status.note}</p>

        {profile.status === "ACTIVE" ? (
          <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-caption text-text-muted">Tier</dt>
              <dd className="text-label font-medium text-text">
                {profile.tier || "Standard"}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">
                Default discount
              </dt>
              <dd className="text-label font-medium tabular-nums text-text">
                {profile.discountPercent}%
              </dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Verified on</dt>
              <dd className="text-label font-medium text-text">
                {profile.approvedAt
                  ? new Date(profile.approvedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </dd>
            </div>
          </dl>
        ) : null}

        {profile.status === "ACTIVE" ? (
          <Alert tone="info" className="mt-4">
            <p className="text-caption">
              Some products have their own wholesale price and minimum order
              quantity. Those are shown on the product page; anything without
              one uses your {profile.discountPercent}% account discount.
            </p>
          </Alert>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-label font-semibold text-text">Business details</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <Field label="Business / shop name" htmlFor="b2b-profile-company">
            <Input
              id="b2b-profile-company"
              value={company}
              maxLength={160}
              onChange={(event) => setCompany(event.target.value)}
              required
            />
          </Field>
          <Field label="Contact name" htmlFor="b2b-profile-contact">
            <Input
              id="b2b-profile-contact"
              value={contactName}
              maxLength={120}
              onChange={(event) => setContactName(event.target.value)}
              required
            />
          </Field>
          <Field
            label="Shop address"
            htmlFor="b2b-profile-address"
            hint="Used for wholesale delivery and invoices."
          >
            <Input
              id="b2b-profile-address"
              value={shopAddress}
              maxLength={300}
              onChange={(event) => setShopAddress(event.target.value)}
            />
          </Field>
          <Field label="NID number" htmlFor="b2b-profile-nid" hint="Verified by admin — contact support to change it.">
            <Input
              id="b2b-profile-nid"
              value={profile.nidNumber ?? "—"}
              readOnly
              disabled
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-label font-semibold text-text">Quick links</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/b2b/addresses"
            className={buttonClassName({ variant: "ghost", size: "sm", className: "border border-border" })}
          >
            Delivery addresses
          </Link>
          <Link
            href="/b2b/orders"
            className={buttonClassName({ variant: "ghost", size: "sm", className: "border border-border" })}
          >
            My orders
          </Link>
          <Link
            href="/product-request"
            className={buttonClassName({ variant: "ghost", size: "sm", className: "border border-border" })}
          >
            Request a product
          </Link>
          <Link
            href="/b2b/login-details"
            className={buttonClassName({ variant: "ghost", size: "sm", className: "border border-border" })}
          >
            Login details
          </Link>
        </div>
      </section>
    </div>
  );
}

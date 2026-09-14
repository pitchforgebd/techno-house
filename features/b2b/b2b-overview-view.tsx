import Link from "next/link";
import {
  BadgeCheck,
  Clock,
  MapPin,
  Package,
  ShieldAlert,
  Tags,
} from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { AccountShell } from "@/features/account/account-shell";
import { formatMoney } from "@/lib/format/currency";
import type { MyB2BProfile } from "@/lib/b2b/applications";
import type { CustomerOrderView } from "@/lib/orders/order-view";

const STATUS = {
  PENDING: {
    Icon: Clock,
    label: "Verification pending",
    note: "An admin is reviewing your business details. Retail prices apply until the account is verified.",
    tone: "border-warning/35 bg-warning/10 text-warning",
  },
  ACTIVE: {
    Icon: BadgeCheck,
    label: "Verified",
    note: "Wholesale prices and order minimums are active across the store.",
    tone: "border-primary/35 bg-primary-soft/60 text-primary",
  },
  SUSPENDED: {
    Icon: ShieldAlert,
    label: "Suspended",
    note: "Wholesale pricing is paused on this account. Contact support to restore it.",
    tone: "border-danger/35 bg-danger/10 text-danger",
  },
} as const;

/** `approvedAt` arrives as an ISO string; a raw timestamp is not a date. */
function approvedLabel(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

const SHORTCUTS = [
  {
    href: "/b2b/pricing",
    label: "My price list",
    hint: "Your price on every product",
    Icon: Tags,
  },
  {
    href: "/b2b/orders",
    label: "Orders",
    hint: "Track wholesale purchases",
    Icon: Package,
  },
  {
    href: "/b2b/addresses",
    label: "Addresses",
    hint: "Where deliveries go",
    Icon: MapPin,
  },
] as const;

/**
 * Wholesale panel home.
 *
 * Deliberately not the retail overview: a trade buyer opens this to check
 * their standing, their rate and their last order — not a wishlist or a
 * compare list.
 */
export function B2BOverviewView({
  profile,
  latestOrder,
}: {
  profile: MyB2BProfile;
  latestOrder: CustomerOrderView | null;
}) {
  const status = STATUS[profile.status];

  return (
    <AccountShell title="Wholesale overview">
      <div className="space-y-6">
        <section
          className={`flex flex-wrap items-start gap-3.5 rounded-lg border px-4 py-4 sm:px-5 ${status.tone}`}
        >
          <status.Icon aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-label font-semibold">
              {profile.company} · {status.label}
            </p>
            <p className="mt-0.5 text-caption leading-relaxed opacity-90">
              {status.note}
            </p>
          </div>
        </section>

        <section aria-labelledby="b2b-terms-heading">
          <h2
            id="b2b-terms-heading"
            className="text-label font-semibold text-text"
          >
            Your terms
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
              <dt className="text-caption text-text-muted">Tier</dt>
              <dd className="mt-1 text-lg font-semibold tracking-tight text-text">
                {profile.tier || "Standard"}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
              <dt className="text-caption text-text-muted">Discount off retail</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-text">
                {profile.discountPercent > 0
                  ? `${profile.discountPercent}%`
                  : "Per product"}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
              <dt className="text-caption text-text-muted">Verified on</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-text">
                {approvedLabel(profile.approvedAt)}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="b2b-order-heading">
          <h2
            id="b2b-order-heading"
            className="text-label font-semibold text-text"
          >
            Latest order
          </h2>
          {latestOrder ? (
            <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
              <p className="font-mono text-label text-primary">
                {latestOrder.number}
              </p>
              <p className="mt-1 text-caption text-text-muted">
                {latestOrder.itemCount} item
                {latestOrder.itemCount === 1 ? "" : "s"} ·{" "}
                {formatMoney({ amount: latestOrder.totalAmount })}
              </p>
              <p className="mt-3">
                <Link
                  href="/b2b/orders"
                  className={buttonClassName({ size: "sm", variant: "secondary" })}
                >
                  All orders
                </Link>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-label text-text-muted">
              No orders yet. Wholesale prices apply automatically at checkout.
            </p>
          )}
        </section>

        <section aria-labelledby="b2b-shortcuts-heading">
          <h2
            id="b2b-shortcuts-heading"
            className="text-label font-semibold text-text"
          >
            Shortcuts
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {SHORTCUTS.map(({ href, label, hint, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon aria-hidden strokeWidth={1.75} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-label font-semibold text-text">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-caption text-text-muted">
                      {hint}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AccountShell>
  );
}

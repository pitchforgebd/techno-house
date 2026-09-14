import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TrackBreadcrumb } from "@/features/track/track-breadcrumb";
import { TrackOrderList } from "@/features/track/track-views";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resolvePublicTrackQuery } from "@/lib/orders/public-tracking";
import { getRequestMeta } from "@/lib/auth/request-meta";

export const metadata: Metadata = {
  title: "Order Tracking — Techno House",
};

type Props = {
  searchParams: Promise<{ q?: string; phone?: string; pin?: string }>;
};

export default async function TrackOrderPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? params.phone ?? "").trim();
  const pin = (params.pin ?? "").trim();

  let throttled = false;
  if (q) {
    const meta = await getRequestMeta();
    const resolved = await resolvePublicTrackQuery(q, {
      phoneSuffix: pin,
      ip: meta.ip,
    });
    if (resolved.kind === "detail") {
      redirect(
        `/track/${encodeURIComponent(resolved.detail.number)}?pin=${encodeURIComponent(pin)}`,
      );
    }
    // An order ID on its own is no longer enough — send them to the order's
    // own page, which asks for the phone digits (DSA-05).
    if (resolved.kind === "needsPhone") {
      redirect(`/track/${encodeURIComponent(resolved.orderNumber)}`);
    }
    throttled = resolved.kind === "throttled";
    if (resolved.kind === "list") {
      return (
        <div className="min-h-[50vh] bg-neutral-100">
          <TrackBreadcrumb />
          <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
            <TrackOrderList phone={resolved.phone} items={resolved.items} />
            <p className="mt-4 text-center text-sm text-neutral-500">
              <Link
                href="/track"
                className="font-medium text-primary hover:underline"
              >
                Search again
              </Link>
            </p>
          </div>
        </div>
      );
    }
  }

  const notFoundQuery = Boolean(q) && !throttled;

  return (
    <div className="min-h-[50vh] bg-neutral-100">
      <TrackBreadcrumb />
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Order Tracking
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Enter your phone number to see your orders, or an order ID to open
            tracking directly.
          </p>

          {throttled ? (
            <Alert className="mt-4" tone="danger" title="Too many attempts">
              Please wait a few minutes and try again.
            </Alert>
          ) : notFoundQuery ? (
            <Alert className="mt-4" tone="danger" title="No orders found">
              Check the phone number or order ID and try again.
            </Alert>
          ) : null}

          <form action="/track" method="get" className="mt-5 space-y-4">
            <Field label="Phone or order ID" htmlFor="track-q">
              <Input
                id="track-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="01XXXXXXXXX or order ID"
                autoComplete="tel"
                required
              />
            </Field>
            {/* No colour override: Button's primary variant already carries
                bg-primary / hover:bg-primary-hover, so this now follows the
                brand and the admin theme instead of a near-miss blue. */}
            <Button type="submit" className="w-full">
              Track order
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

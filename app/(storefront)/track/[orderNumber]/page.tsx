import type { Metadata } from "next";
import Link from "next/link";
import { TrackBreadcrumb } from "@/features/track/track-breadcrumb";
import { TrackOrderStepper } from "@/features/track/track-views";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { limitPublicTracking } from "@/lib/auth/rate-limit";
import {
  getPublicOrderTracking,
  TRACK_PHONE_SUFFIX_LENGTH,
} from "@/lib/orders/public-tracking";

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ pin?: string }>;
};

export const metadata: Metadata = {
  // Deliberately generic and not per-order: the old title echoed the order
  // number, which leaked it into browser history, referrers and page titles
  // before the visitor had proved anything.
  title: "Order Tracking — Techno House",
  robots: { index: false, follow: false },
};

export default async function TrackOrderDetailPage({
  params,
  searchParams,
}: Props) {
  const { orderNumber } = await params;
  const { pin } = await searchParams;
  const decoded = decodeURIComponent(orderNumber);
  const suffix = (pin ?? "").trim();

  const meta = await getRequestMeta();
  const limited = await limitPublicTracking(meta.ip, decoded);

  // `null` covers three cases on purpose — no such order, wrong phone digits,
  // and nothing supplied — so this page cannot be used to confirm which order
  // numbers exist (DSA-05).
  const detail = limited.ok
    ? await getPublicOrderTracking(decoded, suffix)
    : null;

  if (detail) {
    return (
      <div className="min-h-[50vh] bg-neutral-100">
        <TrackBreadcrumb />
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <TrackOrderStepper detail={detail} />
          <p className="mt-4 text-center text-sm text-neutral-500">
            <Link
              href="/track"
              className="font-medium text-primary hover:underline"
            >
              Track another order
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] bg-neutral-100">
      <TrackBreadcrumb />
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Confirm it&rsquo;s your order
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            For your security, enter the last {TRACK_PHONE_SUFFIX_LENGTH} digits
            of the phone number used to place order {decoded}.
          </p>

          {!limited.ok ? (
            <Alert className="mt-4" tone="danger" title="Too many attempts">
              {limited.formError}
            </Alert>
          ) : suffix ? (
            <Alert className="mt-4" tone="danger" title="That did not match">
              Check the order ID and the last {TRACK_PHONE_SUFFIX_LENGTH} digits
              of the phone number, then try again.
            </Alert>
          ) : null}

          <form
            action={`/track/${encodeURIComponent(decoded)}`}
            method="get"
            className="mt-5 space-y-4"
          >
            <Field
              label={`Last ${TRACK_PHONE_SUFFIX_LENGTH} digits of your phone`}
              htmlFor="track-pin"
            >
              <Input
                id="track-pin"
                name="pin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={TRACK_PHONE_SUFFIX_LENGTH}
                placeholder="1234"
                required
              />
            </Field>
            <Button
              type="submit"
              className="w-full"
            >
              View tracking
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-neutral-500">
            <Link
              href="/track"
              className="font-medium text-primary hover:underline"
            >
              Search by phone number instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

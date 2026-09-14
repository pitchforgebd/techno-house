import type { Metadata } from "next";
import Link from "next/link";
import { TrackBreadcrumb } from "@/features/track/track-breadcrumb";

export const metadata: Metadata = {
  title: "Order not found — Techno House",
};

export default function TrackNotFoundPage() {
  return (
    <div className="min-h-[50vh] bg-neutral-100">
      <TrackBreadcrumb />
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Order not found
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          That tracking link is invalid or the order was removed.
        </p>
        <p className="mt-6">
          <Link
            href="/track"
            className="font-medium text-primary hover:underline"
          >
            Back to Order Tracking
          </Link>
        </p>
      </div>
    </div>
  );
}

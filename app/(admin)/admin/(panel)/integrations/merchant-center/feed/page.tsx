import type { Metadata } from "next";
import Link from "next/link";
import { getAdminMerchantConfig } from "@/lib/analytics/config";
import { GOOGLE_FEED_PATH } from "@/lib/analytics/feeds";

export const metadata: Metadata = { title: "Merchant Center product feed" };

export default async function Page() {
  const config = await getAdminMerchantConfig();
  const live = config.isEnabled;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <p className="px-1 text-caption font-medium text-primary">
        <Link href="/admin/analytics" className="hover:underline">
          Marketing Analytics
        </Link>
        <span className="text-text-muted"> / </span>
        <Link
          href="/admin/integrations/merchant-center"
          className="hover:underline"
        >
          Merchant Center
        </Link>
        <span className="text-text-muted"> / Product feed</span>
      </p>
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900">Product feed</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Active products are listed as RSS/XML when Merchant Center is enabled.
          Google API upload is deferred.
        </p>
        <p className="mt-4 text-sm">
          Status: <strong>{live ? "Published" : "Not published (404)"}</strong>
        </p>
        <p className="mt-2 text-sm">
          Feed URL:{" "}
          <Link
            href={GOOGLE_FEED_PATH}
            className="text-[#3897f0] hover:underline"
          >
            {GOOGLE_FEED_PATH}
          </Link>
        </p>
        <p className="mt-6">
          <Link
            href="/admin/integrations/merchant-center"
            className="text-sm font-medium text-[#3897f0] hover:underline"
          >
            Merchant Center settings
          </Link>
        </p>
      </section>
    </div>
  );
}

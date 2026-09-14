import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";
import { SupportRequestForm } from "@/features/support/support-request-form";
import { getCustomerSession } from "@/lib/auth/customer-session";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("support", "Support — Techno House");
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getCustomerSession(),
  ]);

  return (
    <>
      <StorefrontContentPage
        slug="support"
        fallbackHeading="Support"
        fallbackTitle="Support hub"
        fallbackDescription="Support options will appear here."
      />
      <div className="mx-auto max-w-content px-4 pb-12">
        <SupportRequestForm
          status={params.status}
          error={params.error}
          defaultName={session?.fullName ?? undefined}
          defaultEmail={session?.email ?? undefined}
        />
      </div>
    </>
  );
}

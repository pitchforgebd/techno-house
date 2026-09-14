import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { AdminProductReviews } from "@/features/admin/reviews/admin-product-reviews";
import { loadAdminProductReviews } from "@/lib/admin/load-reviews";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadAdminProductReviews(slug);
  return {
    title: data ? `Reviews · ${data.productName}` : "Reviews not found",
  };
}

export default async function AdminProductReviewsPage({ params }: Props) {
  const session = await requireStaffSession();
  const { slug } = await params;
  const data = await loadAdminProductReviews(slug);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="Product not found"
          description="That product is not in the catalogue."
        />
        <p className="mt-6 text-center">
          <Link
            href="/admin/reviews"
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Back to reviews
          </Link>
        </p>
      </div>
    );
  }

  return (
    <AdminProductReviews
      productName={data.productName}
      productSlug={data.productSlug}
      items={data.items}
      canAdd={hasPermission(session, "reviews.add")}
      canModerate={hasPermission(session, "reviews.moderate")}
      canDelete={hasPermission(session, "reviews.delete")}
    />
  );
}

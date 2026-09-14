import type { Metadata } from "next";
import Link from "next/link";
import { AdminProductRequestDetail } from "@/features/admin/catalog/admin-product-request-detail";
import { getAdminProductRequestById } from "@/lib/admin/load-product-requests";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const request = await getAdminProductRequestById(id);
  return {
    title: request
      ? `Product request — ${request.productWanted}`
      : "Product request not found",
  };
}

export default async function AdminProductRequestDetailPage({ params }: Props) {
  const session = await requireStaffSession();
  const { id } = await params;
  const request = await getAdminProductRequestById(id);

  if (!request) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Request not found
        </h1>
        <p className="mt-2 text-body text-text-muted">
          That product request is missing or was removed.
        </p>
        <p className="mt-6">
          <Link
            href="/admin/product-requests"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Back to product requests
          </Link>
        </p>
      </div>
    );
  }

  return (
    <AdminProductRequestDetail
      request={request}
      canManage={hasAnyPermission(session, [
        "product_requests.manage",
        "product_requests.view",
      ])}
    />
  );
}

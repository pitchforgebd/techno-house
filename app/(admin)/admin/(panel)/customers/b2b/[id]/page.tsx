import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminB2bAccountDetail } from "@/features/admin/customers/admin-b2b-accounts";
import { getAdminB2BAccountById } from "@/lib/admin/b2b-accounts";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const account = await getAdminB2BAccountById(id);
  return {
    title: account ? account.company : "B2B account not found",
  };
}

export default async function AdminB2bAccountDetailPage({ params }: Props) {
  const session = await requireStaffSession();
  const { id } = await params;
  const account = await getAdminB2BAccountById(id);
  if (!account) {
    notFound();
  }
  return (
    <AdminB2bAccountDetail
      account={account}
      canManage={hasPermission(session, "customer.b2b.manage")}
    />
  );
}

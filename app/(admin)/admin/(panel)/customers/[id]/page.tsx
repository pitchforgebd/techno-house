import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCustomerDetail } from "@/features/admin/customers/admin-customer-detail";
import {
  getAdminCustomerById,
  getAdminCustomerOrders,
} from "@/lib/admin/load-customers";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const customer = await getAdminCustomerById(id);
  return {
    title: customer ? customer.fullName : "Customer not found",
  };
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const session = await requireStaffSession();
  const { id } = await params;
  const customer = await getAdminCustomerById(id);
  if (!customer) {
    notFound();
  }
  const orders = await getAdminCustomerOrders(customer);
  return (
    <AdminCustomerDetail
      customer={customer}
      orders={orders}
      canEdit={hasPermission(session, "customer.edit")}
    />
  );
}

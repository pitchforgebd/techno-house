import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminCustomerForm } from "@/features/admin/customers/admin-customer-form";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Add customer",
};

export default async function AdminNewCustomerPage() {
  const session = await requireStaffSession();
  if (!hasPermission(session, "customer.add")) {
    redirect("/admin/customers");
  }
  return <AdminCustomerForm />;
}

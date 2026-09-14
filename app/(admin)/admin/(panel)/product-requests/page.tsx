import type { Metadata } from "next";
import { AdminProductRequestsList } from "@/features/admin/catalog/admin-product-requests";
import { listAdminProductRequests } from "@/lib/admin/load-product-requests";

export const metadata: Metadata = {
  title: "Product requests",
};

export default async function AdminProductRequestsPage() {
  const items = await listAdminProductRequests();
  return <AdminProductRequestsList items={items} />;
}

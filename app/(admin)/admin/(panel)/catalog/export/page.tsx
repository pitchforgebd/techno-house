import type { Metadata } from "next";
import { AdminBulkExport } from "@/features/admin/catalog/admin-bulk-export";
import { listAllProductsForExport } from "@/lib/catalog/bulk-csv";

export const metadata: Metadata = {
  title: "Bulk export",
};

export default async function AdminBulkExportPage() {
  const products = await listAllProductsForExport();
  return <AdminBulkExport products={products} />;
}

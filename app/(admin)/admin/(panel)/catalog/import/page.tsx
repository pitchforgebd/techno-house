import type { Metadata } from "next";
import { AdminBulkImport } from "@/features/admin/catalog/admin-bulk-import";
import { brandRepository, categoryRepository } from "@/lib/data";

export const metadata: Metadata = {
  title: "Bulk import",
};

export default async function AdminBulkImportPage() {
  const [categories, brands] = await Promise.all([
    categoryRepository.list(),
    brandRepository.list(),
  ]);

  return (
    <AdminBulkImport
      categories={categories.map((item) => ({ name: item.name, slug: item.slug }))}
      brands={brands.map((item) => ({ name: item.name, slug: item.slug }))}
    />
  );
}

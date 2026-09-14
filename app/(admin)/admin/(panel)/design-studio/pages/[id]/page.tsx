import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminStudioPageForm } from "@/features/admin/design-studio/admin-studio-cms-pages";
import { getAdminContentPage } from "@/lib/content/pages";

export const metadata: Metadata = {
  title: "Edit page · Design Studio",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DesignStudioEditPageRoute({ params }: Props) {
  const { id } = await params;
  const page = await getAdminContentPage(id);
  if (!page) notFound();
  return <AdminStudioPageForm page={page} />;
}

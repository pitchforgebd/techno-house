import type { Metadata } from "next";
import { AdminLabelList } from "@/features/admin/labels/admin-label-list";
import { loadAdminLabelList } from "@/lib/admin/load-labels";
import {
  parseAdminLabelListParams,
  type AdminLabelSearchParams,
} from "@/lib/admin/label-list-params";

export const metadata: Metadata = {
  title: "Custom labels",
};

export default async function AdminLabelsPage({
  searchParams,
}: {
  searchParams: Promise<AdminLabelSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseAdminLabelListParams(raw);
  const data = await loadAdminLabelList(params);
  return <AdminLabelList data={data} />;
}

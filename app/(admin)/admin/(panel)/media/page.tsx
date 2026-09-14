import type { Metadata } from "next";
import { AdminMediaLibrary } from "@/features/admin/media/admin-media-library";
import { loadAdminMediaList } from "@/lib/admin/load-media";
import {
  parseMediaListParams,
  type AdminListSearchParams,
} from "@/lib/admin/support-list-params";

export const metadata: Metadata = {
  title: "All uploaded files",
};

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<AdminListSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseMediaListParams(raw);
  const data = await loadAdminMediaList(params);
  return <AdminMediaLibrary data={data} />;
}

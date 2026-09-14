import type { Metadata } from "next";
import { AdminContactList } from "@/features/admin/support/admin-contact-list";
import { loadAdminContactList } from "@/lib/admin/load-support";
import {
  parseContactListParams,
  type AdminListSearchParams,
} from "@/lib/admin/support-list-params";

export const metadata: Metadata = {
  title: "Contacts",
};

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<AdminListSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseContactListParams(raw);
  const data = await loadAdminContactList(params);
  return <AdminContactList data={data} />;
}

import type { Metadata } from "next";
import { AdminAttributeList } from "@/features/admin/attributes/admin-attribute-list";
import { loadAdminAttributeList } from "@/lib/admin/load-attributes";
import {
  parseAdminAttributeListParams,
  type AdminAttributeSearchParams,
} from "@/lib/admin/attribute-list-params";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Attributes",
};

export default async function AdminAttributesPage({
  searchParams,
}: {
  searchParams: Promise<AdminAttributeSearchParams>;
}) {
  const session = await requireStaffSession();
  const raw = await searchParams;
  const params = parseAdminAttributeListParams(raw);
  const data = await loadAdminAttributeList(params);
  return (
    <AdminAttributeList
      items={data.items}
      total={data.total}
      page={data.page}
      pageCount={data.pageCount}
      params={data.params}
      canAdd={hasPermission(session, "attribute.add")}
      canEdit={hasPermission(session, "attribute.edit")}
      canDelete={hasPermission(session, "attribute.delete")}
    />
  );
}

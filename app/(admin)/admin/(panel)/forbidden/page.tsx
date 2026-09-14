import type { Metadata } from "next";
import { AdminForbiddenView } from "@/features/admin/admin-forbidden-view";

export const metadata: Metadata = {
  title: "Access denied",
};

export default function AdminForbiddenPage() {
  return <AdminForbiddenView />;
}

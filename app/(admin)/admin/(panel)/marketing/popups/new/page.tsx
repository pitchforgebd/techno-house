import type { Metadata } from "next";
import { AdminDynamicPopupForm } from "@/features/admin/marketing/admin-dynamic-popups";

export const metadata: Metadata = { title: "New Dynamic Popup" };

export default function AdminNewPopupPage() {
  return <AdminDynamicPopupForm />;
}

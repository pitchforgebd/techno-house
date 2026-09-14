import type { Metadata } from "next";
import { AdminCustomAlertForm } from "@/features/admin/marketing/admin-custom-alerts";

export const metadata: Metadata = { title: "New Custom Alert" };

export default function AdminNewAlertPage() {
  return <AdminCustomAlertForm />;
}

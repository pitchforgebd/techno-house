import type { Metadata } from "next";
import { AdminStaffProfile } from "@/features/admin/staff/admin-staff-profile";

export const metadata: Metadata = {
  title: "My profile",
};

export default function AdminProfilePage() {
  return <AdminStaffProfile />;
}

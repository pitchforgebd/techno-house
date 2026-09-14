import type { Metadata } from "next";
import { AdminCompareReport } from "@/features/admin/reports/admin-compare-report";

export const metadata: Metadata = {
  title: "Products Compare",
};

export default function AdminCompareReportPage() {
  return <AdminCompareReport />;
}

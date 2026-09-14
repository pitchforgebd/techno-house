import type { Metadata } from "next";
import { AdminPcBuilderRules } from "@/features/admin/pc-builder/admin-pc-builder-rules";
import { listCompatibilityRules } from "@/lib/pc-builder/rules";

export const metadata: Metadata = {
  title: "PC Builder — Compatibility rules",
};

export default async function AdminPcBuilderRulesPage() {
  const rules = await listCompatibilityRules();
  return <AdminPcBuilderRules rules={rules} />;
}

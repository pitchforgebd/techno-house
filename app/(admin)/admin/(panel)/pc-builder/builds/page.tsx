import type { Metadata } from "next";
import { AdminPcBuilderBuilds } from "@/features/admin/pc-builder/admin-pc-builder-builds";
import { getAdminPcBuilderBuilds } from "@/lib/pc-builder/admin-builds";

export const metadata: Metadata = {
  title: "PC Builder — Saved builds",
};

export default async function AdminPcBuilderBuildsPage() {
  const builds = await getAdminPcBuilderBuilds();
  return <AdminPcBuilderBuilds builds={builds} />;
}

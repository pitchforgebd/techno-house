import type { Metadata } from "next";
import { AdminFilesystemSettings } from "@/features/admin/settings/admin-filesystem-settings";
import { getFilesystemSettings } from "@/lib/storage/filesystem-config";

export const metadata: Metadata = {
  title: "File System & Cache",
};

export default async function AdminFilesystemSettingsPage() {
  const initial = await getFilesystemSettings();
  return <AdminFilesystemSettings initial={initial} />;
}

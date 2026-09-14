import type { Metadata } from "next";
import { AdminGoogleMapSettings } from "@/features/admin/settings/admin-google-map";
import { getAdminGoogleMapConfig } from "@/lib/maps/config";

export const metadata: Metadata = {
  title: "Google Map",
};

export default async function AdminGoogleMapPage() {
  const config = await getAdminGoogleMapConfig();
  return <AdminGoogleMapSettings config={config} />;
}

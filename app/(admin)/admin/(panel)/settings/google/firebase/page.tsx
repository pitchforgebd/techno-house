import type { Metadata } from "next";
import { AdminGoogleFirebaseSettings } from "@/features/admin/settings/admin-google-firebase";
import { getAdminFirebaseConfig } from "@/lib/social/firebase-config";

export const metadata: Metadata = {
  title: "Google Firebase",
};

export default async function AdminGoogleFirebasePage() {
  const config = await getAdminFirebaseConfig();
  return <AdminGoogleFirebaseSettings config={config} />;
}

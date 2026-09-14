import type { Metadata } from "next";
import { AdminFeatureFlags } from "@/features/admin/settings/admin-feature-flags";
import { getFeatureFlagStates } from "@/lib/admin/feature-flags-config";

export const metadata: Metadata = {
  title: "Feature Activation",
};

export default async function AdminFeaturesSettingsPage() {
  const initial = await getFeatureFlagStates();
  return <AdminFeatureFlags initial={initial} />;
}

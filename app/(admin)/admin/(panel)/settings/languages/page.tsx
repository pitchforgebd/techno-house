import type { Metadata } from "next";
import { AdminLanguagesSettings } from "@/features/admin/settings/admin-languages-settings";
import { getLanguageSettings } from "@/lib/business/language-config";

export const metadata: Metadata = {
  title: "Languages",
};

export default async function AdminLanguagesSettingsPage() {
  const initial = await getLanguageSettings();
  return <AdminLanguagesSettings initial={initial} />;
}

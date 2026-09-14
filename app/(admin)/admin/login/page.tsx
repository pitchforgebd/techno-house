import { notFound } from "next/navigation";

/**
 * Legacy `/admin/login` — removed so the gate is not advertised.
 * Real sign-in: `/admin/access/{ADMIN_LOGIN_SLUG}`.
 */
export default function LegacyAdminLoginPage() {
  notFound();
}

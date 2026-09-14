import type { Metadata } from "next";
import { AdminOtpSettings } from "@/features/admin/otp/admin-otp-settings";
import { countOtpExemptCustomers, getAdminOtpConfig } from "@/lib/otp/config";

export const metadata: Metadata = {
  title: "OTP / SMS Gateway",
};

export default async function AdminOtpPage() {
  const [config, otpExemptCustomers] = await Promise.all([
    getAdminOtpConfig(),
    countOtpExemptCustomers(),
  ]);
  return (
    <AdminOtpSettings config={config} otpExemptCustomers={otpExemptCustomers} />
  );
}

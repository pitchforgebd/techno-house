import type { Metadata } from "next";
import { AccountAuthShell } from "@/features/account/account-auth-shell";
import { ForgotPasswordForm } from "@/features/account/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — Techno House",
  description: "Mock password reset request. No email is sent.",
  robots: { index: false, follow: false },
};

export default function AccountForgotPasswordPage() {
  return (
    <AccountAuthShell
      title="Forgot password"
      description="Request a reset in this preview. No message is emailed."
    >
      <ForgotPasswordForm />
    </AccountAuthShell>
  );
}

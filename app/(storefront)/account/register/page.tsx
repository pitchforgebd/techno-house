import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountAuthShell } from "@/features/account/account-auth-shell";
import { RegisterForm } from "@/features/account/register-form";

export const metadata: Metadata = {
  title: "Create account — Techno House",
  description: "Mock customer registration. No account is stored.",
  robots: { index: false, follow: false },
};

export default function AccountRegisterPage() {
  return (
    <AccountAuthShell
      title="Create account"
      description="Register a mock customer profile on this device. Nothing is saved on a server."
    >
      <Suspense fallback={<p className="text-caption text-text-muted">Loading…</p>}>
        <RegisterForm />
      </Suspense>
    </AccountAuthShell>
  );
}

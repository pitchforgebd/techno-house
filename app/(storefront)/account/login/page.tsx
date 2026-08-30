import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountAuthShell } from "@/features/account/account-auth-shell";
import { LoginForm } from "@/features/account/login-form";

export const metadata: Metadata = {
  title: "Sign in — Techno House",
  description: "Mock customer sign-in. Real authentication arrives later.",
  robots: { index: false, follow: false },
};

export default function AccountLoginPage() {
  return (
    <AccountAuthShell
      title="Sign in"
      description="Customer account preview. This is not production authentication."
    >
      <Suspense fallback={<p className="text-caption text-text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AccountAuthShell>
  );
}

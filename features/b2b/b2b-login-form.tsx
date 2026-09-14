"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginCustomerAction } from "@/features/account/auth-actions";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_PASSWORD_MAX,
} from "@/lib/account/validation";

/**
 * Wholesale sign-in. The credentials are the same customer identity used for
 * cart and orders — this is a separate entry point, not a separate session
 * system — so it calls the existing (rate-limited, OTP-aware) login action.
 */
export function B2BLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await loginCustomerAction({ email, password });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? null);
        return;
      }
      if ("otpRequired" in result && result.otpRequired) {
        // The store has OTP sign-in switched on; that flow lives on the
        // customer login page, so hand off rather than duplicating it.
        router.push("/account/login?next=%2Fb2b%2Fprofile");
        return;
      }
      setErrors({});
      router.push("/b2b/profile");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError ? (
        <Alert tone="danger" title="Could not sign in">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      <Field label="Email" htmlFor="b2b-login-email" error={errors.email}>
        <Input
          id="b2b-login-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={ACCOUNT_EMAIL_MAX}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="b2b-login-password"
        error={errors.password}
      >
        <Input
          id="b2b-login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={ACCOUNT_PASSWORD_MAX}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-caption text-text-muted">
        No wholesale account yet?{" "}
        <Link
          href="/b2b/register"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Register
        </Link>
        .
      </p>
    </form>
  );
}

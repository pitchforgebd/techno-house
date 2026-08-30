"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMockCustomer } from "@/features/account/use-mock-customer";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_PASSWORD_MAX,
  createMockCustomerSession,
  normalizeEmail,
  validateLoginInput,
} from "@/lib/account/mock-session";
import { safeReturnPath } from "@/lib/account/return-path";
import { notifySuccess } from "@/components/ui/feedback-provider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("next"), "/account");
  const { session, signInMock } = useMockCustomer();
  const [email, setEmail] = useState(session?.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLoginInput({ email, password });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    signInMock(
      createMockCustomerSession({
        email: normalizeEmail(email),
        fullName: session?.fullName || "Customer",
        phone: session?.phone,
      }),
    );
    setPassword("");
    notifySuccess({
      title: "Signed in",
      description: "Mock session only — not production authentication.",
    });
    router.push(returnTo);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <Alert tone="warning" title="Mock sign-in only">
        <p className="text-caption">
          This form never checks a password against a server. Nothing is
          authenticated. Real customer auth is Phase 11.
        </p>
      </Alert>

      {returnTo === "/checkout" ? (
        <Alert tone="info" title="Checkout requires sign-in">
          <p className="text-caption">
            After mock sign-in you will return to checkout. Guest checkout is
            not available.
          </p>
        </Alert>
      ) : null}

      <Field label="Email" htmlFor="login-email" error={errors.email}>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          maxLength={ACCOUNT_EMAIL_MAX}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="login-password"
        error={errors.password}
        hint="Validated for length only. Never stored or sent."
      >
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          maxLength={ACCOUNT_PASSWORD_MAX}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" className="w-full">
        Continue (mock)
      </Button>

      <p className="text-caption text-text-muted">
        New here?{" "}
        <Link
          href={`/account/register?next=${encodeURIComponent(returnTo)}`}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
        {" · "}
        <Link
          href="/account/forgot-password"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Forgot password
        </Link>
      </p>
    </form>
  );
}

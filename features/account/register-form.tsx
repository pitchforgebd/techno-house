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
  ACCOUNT_NAME_MAX,
  ACCOUNT_PASSWORD_MAX,
  ACCOUNT_PHONE_MAX,
  createMockCustomerSession,
  validateRegisterInput,
} from "@/lib/account/mock-session";
import { safeReturnPath } from "@/lib/account/return-path";
import { notifySuccess } from "@/components/ui/feedback-provider";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("next"), "/account");
  const { signInMock } = useMockCustomer();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRegisterInput({
      fullName,
      email,
      phone,
      password,
      confirmPassword,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    signInMock(createMockCustomerSession({ email, fullName, phone }));
    setPassword("");
    setConfirmPassword("");
    notifySuccess({
      title: "Account created",
      description: "Mock session only — nothing is stored on a server.",
    });
    router.push(returnTo);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <Alert tone="warning" title="Mock registration only">
        <p className="text-caption">
          Nothing is stored on a server. This only creates a local mock session
          on this device.
        </p>
      </Alert>

      <Field label="Full name" htmlFor="register-name" error={errors.fullName}>
        <Input
          id="register-name"
          name="fullName"
          autoComplete="name"
          value={fullName}
          maxLength={ACCOUNT_NAME_MAX}
          onChange={(event) => setFullName(event.target.value)}
        />
      </Field>

      <Field label="Email" htmlFor="register-email" error={errors.email}>
        <Input
          id="register-email"
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
        label="Phone (optional)"
        htmlFor="register-phone"
        error={errors.phone}
      >
        <Input
          id="register-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          maxLength={ACCOUNT_PHONE_MAX}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="register-password"
        error={errors.password}
        hint="Length checked only. Never stored."
      >
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          maxLength={ACCOUNT_PASSWORD_MAX}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="register-confirm"
        error={errors.confirmPassword}
      >
        <Input
          id="register-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          maxLength={ACCOUNT_PASSWORD_MAX}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" className="w-full">
        Create account (mock)
      </Button>

      <p className="text-caption text-text-muted">
        Already have an account?{" "}
        <Link
          href={`/account/login?next=${encodeURIComponent(returnTo)}`}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

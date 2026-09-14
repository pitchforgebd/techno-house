"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  registerCustomerAction,
  verifyAuthOtpAction,
} from "@/features/account/auth-actions";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_NAME_MAX,
  ACCOUNT_PASSWORD_MAX,
  ACCOUNT_PHONE_MAX,
} from "@/lib/account/validation";
import { safeReturnPath } from "@/lib/account/return-path";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { SocialLoginButtons } from "@/features/account/social-login-buttons";

export function RegisterForm({
  usableProviders,
}: {
  usableProviders?: { GOOGLE: boolean; FACEBOOK: boolean };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("next"), "/account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [otp, setOtp] = useState<{ token: string; phoneHint: string } | null>(
    null,
  );
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await registerCustomerAction({
        fullName,
        email,
        phone,
        password,
        confirmPassword,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? null);
        return;
      }
      if ("otpRequired" in result && result.otpRequired) {
        setErrors({});
        setOtp({ token: result.token, phoneHint: result.phoneHint });
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      notifySuccess({
        title: "Account created",
        description: "You are signed in.",
      });
      router.push(returnTo);
      router.refresh();
    });
  }

  function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otp) {
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await verifyAuthOtpAction({ token: otp.token, code });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? "That code did not work.");
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setCode("");
      setOtp(null);
      notifySuccess({
        title: "Account created",
        description: "You are signed in.",
      });
      router.push(returnTo);
      router.refresh();
    });
  }

  if (otp) {
    return (
      <form className="space-y-4" onSubmit={handleVerifyOtp} noValidate>
        {formError ? (
          <Alert tone="danger" title="Could not verify code">
            <p className="text-caption">{formError}</p>
          </Alert>
        ) : null}
        <p className="text-caption text-text-muted">
          We sent a verification code to {otp.phoneHint}. Your account will
          be created once the code is verified.
        </p>
        <Field label="Verification code" htmlFor="register-otp-code">
          <Input
            id="register-otp-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={pending}
            autoFocus
          />
        </Field>
        <Button type="submit" className="w-full" disabled={pending || !code}>
          {pending ? "Verifying…" : "Verify and create account"}
        </Button>
        <button
          type="button"
          className="text-caption font-medium text-primary underline-offset-2 hover:underline"
          disabled={pending}
          onClick={() => {
            setOtp(null);
            setCode("");
            setFormError(null);
          }}
        >
          Start over
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert tone="danger" title="Could not create account">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      <SocialLoginButtons
        usableProviders={usableProviders}
        returnTo={returnTo}
        dividerLabel="or register with email"
      />

      <Field label="Full name" htmlFor="register-name" error={errors.fullName}>
        <Input
          id="register-name"
          name="fullName"
          autoComplete="name"
          value={fullName}
          maxLength={ACCOUNT_NAME_MAX}
          onChange={(event) => setFullName(event.target.value)}
          disabled={pending}
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
          disabled={pending}
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
          disabled={pending}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="register-password"
        error={errors.password}
        hint={`At least 8 characters. Stored as Argon2id — never plaintext.`}
      >
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          maxLength={ACCOUNT_PASSWORD_MAX}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
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
          disabled={pending}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
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

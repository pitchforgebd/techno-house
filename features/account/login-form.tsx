"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  loginCustomerAction,
  verifyAuthOtpAction,
} from "@/features/account/auth-actions";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_PASSWORD_MAX,
} from "@/lib/account/validation";
import { safeReturnPath } from "@/lib/account/return-path";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { SocialLoginButtons } from "@/features/account/social-login-buttons";

const SOCIAL_ERROR_MESSAGES: Record<string, string> = {
  social_unavailable: "That sign-in method is not available right now.",
  social_denied: "Sign-in was cancelled.",
  social_invalid_state: "That sign-in link expired. Please try again.",
  social_failed: "Could not sign in with that provider. Please try again.",
  social_link_required:
    "An account already uses this email. Sign in with your password below, then use that button again to link it.",
};

export function LoginForm({
  usableProviders,
  socialError,
}: {
  usableProviders?: { GOOGLE: boolean; FACEBOOK: boolean };
  socialError?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("next"), "/account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const result = await loginCustomerAction({ email, password });
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
      setErrors({});
      notifySuccess({
        title: "Signed in",
        description: "Your session is stored securely on the server.",
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
        setFormError(result.formError ?? "That code did not work.");
        return;
      }
      setPassword("");
      setCode("");
      setOtp(null);
      notifySuccess({
        title: "Signed in",
        description: "Your session is stored securely on the server.",
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
          We sent a verification code to {otp.phoneHint}.
        </p>
        <Field label="Verification code" htmlFor="login-otp-code">
          <Input
            id="login-otp-code"
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
          {pending ? "Verifying…" : "Verify and sign in"}
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
          Use a different account
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {returnTo === "/checkout" ? (
        <Alert tone="info" title="Checkout requires sign-in">
          <p className="text-caption">
            After sign-in you will return to checkout. Guest checkout is not
            available.
          </p>
        </Alert>
      ) : null}

      {formError ? (
        <Alert tone="danger" title="Could not sign in">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      {socialError && SOCIAL_ERROR_MESSAGES[socialError] ? (
        <Alert tone="danger" title="Could not sign in">
          <p className="text-caption">{SOCIAL_ERROR_MESSAGES[socialError]}</p>
        </Alert>
      ) : null}

      <SocialLoginButtons
        usableProviders={usableProviders}
        returnTo={returnTo}
        dividerLabel="or sign in with email"
      />

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
          disabled={pending}
        />
      </Field>

      <Field label="Password" htmlFor="login-password" error={errors.password}>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          maxLength={ACCOUNT_PASSWORD_MAX}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
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

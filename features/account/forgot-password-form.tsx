"use client";

import Link from "next/link";
import { useState, type FormEvent, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/features/account/auth-actions";
import { ACCOUNT_EMAIL_MAX } from "@/lib/account/validation";

/**
 * Password reset email delivery waits on SMTP (Phase 16). This form records
 * the request (and is rate-limited) but does not email anyone.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction({ email });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? null);
        setSubmitted(false);
        return;
      }
      setErrors({});
      setSubmitted(true);
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <Alert tone="info" title="Reset email not sent yet">
        <p className="text-caption">
          Account sign-in works now. Password-reset email needs SMTP, which
          arrives in a later phase. Submitting this form does not email anyone.
        </p>
      </Alert>

      {formError ? (
        <Alert tone="danger" title="Could not continue">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      {submitted ? (
        <Alert tone="success" title="Request recorded">
          <p className="text-caption">
            If an account exists for that address, a reset link would be sent
            once email delivery is enabled. No message was sent from this form.
          </p>
        </Alert>
      ) : null}

      <Field label="Email" htmlFor="forgot-email" error={errors.email}>
        <Input
          id="forgot-email"
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

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Continuing…" : "Continue"}
      </Button>

      <p className="text-caption text-text-muted">
        <Link
          href="/account/login"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

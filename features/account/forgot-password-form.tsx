"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ACCOUNT_EMAIL_MAX,
  validateForgotInput,
} from "@/lib/account/mock-session";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForgotInput({ email });
    setErrors(nextErrors);
    setSubmitted(Object.keys(nextErrors).length === 0);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <Alert tone="warning" title="No email is sent">
        <p className="text-caption">
          Password reset is UI-only. SMTP, tokens, and rate limits land with
          real auth.
        </p>
      </Alert>

      {submitted ? (
        <Alert tone="info" title="Preview complete">
          <p className="text-caption">
            If this were production, a reset link would be emailed when the
            address exists. Nothing was sent from this form.
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
          onChange={(event) => {
            setEmail(event.target.value);
            setSubmitted(false);
          }}
        />
      </Field>

      <Button type="submit" className="w-full">
        Request reset (mock)
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

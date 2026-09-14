"use client";

import { useState, useTransition, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changeCustomerPasswordAction } from "@/features/account/auth-actions";
import {
  ACCOUNT_PASSWORD_MAX,
  ACCOUNT_PASSWORD_MIN,
} from "@/lib/account/validation";

/**
 * Change password for a signed-in customer.
 *
 * There was no way to do this before: `/account/forgot-password` covers the
 * reset-by-email flow, but someone already signed in had no route to rotate
 * their own password.
 *
 * The current password is asked for even though the caller is authenticated —
 * a session left open on a shared machine must not be enough to take the
 * account over. Saving signs every other session out; the server issues this
 * device a fresh one so the customer stays where they are.
 */
export function AccountPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    setDone(false);
    startTransition(async () => {
      const result = await changeCustomerPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? null);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setDone(true);
    });
  }

  return (
    <section
      aria-labelledby="account-password-heading"
      className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <KeyRound aria-hidden strokeWidth={1.75} className="size-5" />
        </span>
        <div className="min-w-0">
          <h2
            id="account-password-heading"
            className="text-lg font-semibold tracking-tight text-text"
          >
            Change password
          </h2>
          <p className="mt-1 max-w-prose text-caption leading-relaxed text-text-muted">
            At least {ACCOUNT_PASSWORD_MIN} characters. Saving signs out every
            other device still using your account.
          </p>
        </div>
      </div>

      {formError ? (
        <Alert tone="danger" title="Could not change password" className="mt-4">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      {done ? (
        <Alert tone="success" title="Password changed" className="mt-4">
          <p className="text-caption">
            Other devices have been signed out. This one stays signed in.
          </p>
        </Alert>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <Field
          label="Current password"
          htmlFor="password-current"
          error={errors.currentPassword}
        >
          <Input
            id="password-current"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            maxLength={ACCOUNT_PASSWORD_MAX}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={pending}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="New password"
            htmlFor="password-new"
            error={errors.newPassword}
          >
            <Input
              id="password-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              maxLength={ACCOUNT_PASSWORD_MAX}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={pending}
              required
            />
          </Field>
          <Field
            label="Confirm new password"
            htmlFor="password-confirm"
            error={errors.confirmPassword}
          >
            <Input
              id="password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              maxLength={ACCOUNT_PASSWORD_MAX}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={pending}
              required
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Changing…" : "Change password"}
          </Button>
          <p className="flex items-center gap-1.5 text-caption text-text-muted">
            <ShieldCheck
              aria-hidden
              strokeWidth={1.75}
              className="size-3.5 shrink-0 text-primary"
            />
            Stored with Argon2id — never in readable form.
          </p>
        </div>
      </form>
    </section>
  );
}

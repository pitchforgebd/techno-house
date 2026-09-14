"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, useTransition } from "react";
import { UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateCustomerProfileAction } from "@/features/account/auth-actions";
import { AccountPasswordForm } from "@/features/account/account-password-form";
import { AccountShell } from "@/features/account/account-shell";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_NAME_MAX,
  ACCOUNT_PHONE_MAX,
} from "@/lib/account/validation";

type ProfileDraft = {
  fullName: string;
  email: string;
  phone: string;
};

export function AccountProfileView({
  title = "Profile",
}: {
  /** The wholesale panel reaches this screen as "Login details". */
  title?: string;
} = {}) {
  const router = useRouter();
  const session = useCustomerSession();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const fullName = draft?.fullName ?? session?.fullName ?? "";
  const email = draft?.email ?? session?.email ?? "";
  const phone = draft?.phone ?? session?.phone ?? "";

  function patchDraft(patch: Partial<ProfileDraft>) {
    setDraft({
      fullName: patch.fullName ?? fullName,
      email: patch.email ?? email,
      phone: patch.phone ?? phone,
    });
    setSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await updateCustomerProfileAction({
        fullName,
        email,
        phone,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? null);
        setSaved(false);
        return;
      }
      setDraft(null);
      setErrors({});
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <AccountShell title={title}>
      <div className="space-y-8">
        <section
          aria-labelledby="account-details-heading"
          className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6"
        >
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <UserRound aria-hidden strokeWidth={1.75} className="size-5" />
          </span>
          <div className="min-w-0">
            <h2
              id="account-details-heading"
              className="text-lg font-semibold tracking-tight text-text"
            >
              Account details
            </h2>
            <p className="mt-1 max-w-prose text-caption leading-relaxed text-text-muted">
              Changes save to your account. Email and phone are not verified
              yet.
            </p>
          </div>
        </div>

        {formError ? (
          <Alert tone="danger" title="Could not save" className="mt-4">
            <p className="text-caption">{formError}</p>
          </Alert>
        ) : null}

        {saved ? (
          <Alert tone="success" title="Profile saved" className="mt-4">
            <p className="text-caption">Your account details were updated.</p>
          </Alert>
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <Field
            label="Full name"
            htmlFor="profile-name"
            error={errors.fullName}
          >
            <Input
              id="profile-name"
              name="fullName"
              autoComplete="name"
              value={fullName}
              maxLength={ACCOUNT_NAME_MAX}
              onChange={(event) => patchDraft({ fullName: event.target.value })}
              disabled={pending}
            />
          </Field>
          <Field label="Email" htmlFor="profile-email" error={errors.email}>
            <Input
              id="profile-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              maxLength={ACCOUNT_EMAIL_MAX}
              onChange={(event) => patchDraft({ email: event.target.value })}
              disabled={pending}
            />
          </Field>
          <Field
            label="Phone"
            htmlFor="profile-phone"
            hint="Optional."
            error={errors.phone}
          >
            <Input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              maxLength={ACCOUNT_PHONE_MAX}
              onChange={(event) => patchDraft({ phone: event.target.value })}
              disabled={pending}
            />
          </Field>
          <div className="border-t border-border/70 pt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
        </section>

        <AccountPasswordForm />
      </div>
    </AccountShell>
  );
}

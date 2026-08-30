"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AccountShell } from "@/features/account/account-shell";
import { useMockCustomer } from "@/features/account/use-mock-customer";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_NAME_MAX,
  ACCOUNT_PHONE_MAX,
  createMockCustomerSession,
  validateProfileInput,
} from "@/lib/account/mock-session";

type ProfileDraft = {
  fullName: string;
  email: string;
  phone: string;
};

export function AccountProfileView() {
  const { session, signInMock } = useMockCustomer();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

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
    const nextErrors = validateProfileInput({ fullName, email, phone });
    setErrors(nextErrors);
    setSaved(false);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    signInMock(createMockCustomerSession({ fullName, email, phone }));
    setDraft(null);
    setSaved(true);
  }

  return (
    <AccountShell title="Profile">
      <div className="space-y-8">
        <p className="text-caption text-text-muted">
          Updates stay on this device. Email and phone are not verified.
          Password changes wait for Phase 11.
        </p>

        {saved ? (
          <Alert tone="success" title="Saved on this device">
            <p className="text-caption">
              Not a server profile. Real account records arrive with customer
              auth.
            </p>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
            />
          </Field>
          <Field
            label="Phone"
            htmlFor="profile-phone"
            hint="Optional for this preview."
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
            />
          </Field>
          <Button type="submit" size="sm">
            Save profile
          </Button>
        </form>
      </div>
    </AccountShell>
  );
}

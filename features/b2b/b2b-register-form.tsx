"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { registerB2BAction } from "@/features/b2b/b2b-actions";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_NAME_MAX,
  ACCOUNT_PASSWORD_MAX,
  ACCOUNT_PHONE_MAX,
} from "@/lib/account/validation";
import { B2B_COMPANY_MAX, B2B_NID_MAX } from "@/lib/b2b/limits";

export function B2BRegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await registerB2BAction({
        fullName,
        company,
        email,
        phone,
        nidNumber,
        password,
        confirmPassword,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? null);
        return;
      }
      setErrors({});
      notifySuccess({
        title: "Wholesale application submitted",
        description:
          "You are signed in. Wholesale prices appear once an admin verifies the account.",
      });
      router.push("/b2b/profile");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError ? (
        <Alert tone="danger" title="Could not register">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      <Field label="Your name" htmlFor="b2b-name" error={errors.fullName}>
        <Input
          id="b2b-name"
          name="fullName"
          autoComplete="name"
          maxLength={ACCOUNT_NAME_MAX}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Business / shop name"
        htmlFor="b2b-company"
        error={errors.company}
      >
        <Input
          id="b2b-company"
          name="company"
          autoComplete="organization"
          maxLength={B2B_COMPANY_MAX}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          required
        />
      </Field>

      <Field label="Phone number" htmlFor="b2b-phone" error={errors.phone}>
        <Input
          id="b2b-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="01XXXXXXXXX"
          maxLength={ACCOUNT_PHONE_MAX}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
      </Field>

      <Field label="Email" htmlFor="b2b-email" error={errors.email}>
        <Input
          id="b2b-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={ACCOUNT_EMAIL_MAX}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>

      <Field label="NID number" htmlFor="b2b-nid" error={errors.nidNumber}>
        <Input
          id="b2b-nid"
          name="nidNumber"
          inputMode="numeric"
          maxLength={B2B_NID_MAX}
          value={nidNumber}
          onChange={(event) => setNidNumber(event.target.value)}
          required
        />
      </Field>

      <Field label="Password" htmlFor="b2b-password" error={errors.password}>
        <Input
          id="b2b-password"
          name="password"
          type="password"
          autoComplete="new-password"
          maxLength={ACCOUNT_PASSWORD_MAX}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="b2b-confirm"
        error={errors.confirmPassword}
      >
        <Input
          id="b2b-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          maxLength={ACCOUNT_PASSWORD_MAX}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Create wholesale account"}
      </Button>

      <p className="text-caption text-text-muted">
        Already have a wholesale account?{" "}
        <Link
          href="/b2b/login"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}

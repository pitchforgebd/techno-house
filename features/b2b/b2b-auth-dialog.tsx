"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { useB2BSession } from "@/features/b2b/use-b2b-session";
import {
  normalizeEmail,
  normalizeFullName,
  normalizePhone,
} from "@/lib/account/mock-session";
import {
  normalizeShopAddress,
  normalizeShopName,
  validateB2BLoginInput,
  validateB2BRegisterInput,
  type B2BAccount,
} from "@/lib/b2b/mock-session";
import { cn } from "@/lib/cn";

type Tab = "register" | "login";

export function B2BAuthDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { register, signIn } = useB2BSession();
  const [tab, setTab] = useState<Tab>("register");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tradeLicenceFileName, setTradeLicenceFileName] = useState("");
  const [nidFileName, setNidFileName] = useState("");

  function resetErrors() {
    setErrors({});
    setFormError(null);
  }

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetErrors();
    const nextErrors = validateB2BRegisterInput({
      fullName,
      shopName,
      shopAddress,
      phone,
      email,
      password,
      confirmPassword,
      tradeLicenceFileName,
      nidFileName,
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const account: B2BAccount = {
      email: normalizeEmail(email),
      password,
      fullName: normalizeFullName(fullName),
      shopName: normalizeShopName(shopName),
      shopAddress: normalizeShopAddress(shopAddress),
      phone: normalizePhone(phone),
      tradeLicenceFileName,
      nidFileName,
      createdAt: new Date().toISOString(),
    };

    const result = register(account);
    if (!result.ok) {
      setFormError(result.reason);
      return;
    }

    notifySuccess({
      title: "B2B account created",
      description: "Wholesale prices are now visible on this device.",
    });
    onClose();
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetErrors();
    const nextErrors = validateB2BLoginInput({ email, password });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const result = signIn(normalizeEmail(email), password);
    if (!result.ok) {
      setFormError(result.reason);
      return;
    }

    notifySuccess({
      title: "Signed in as B2B",
      description: "Wholesale prices are now visible on this device.",
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="B2B wholesale access"
    >
      <div className="space-y-4">
        <Alert tone="warning" title="Mock B2B only">
          <p className="text-caption">
            Registration and login are stored in this browser only. No files are
            uploaded to a server. Real B2B verification is a later phase.
          </p>
        </Alert>

        <div className="flex gap-1 border border-border bg-surface-muted p-1">
          {(["register", "login"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value);
                resetErrors();
              }}
              className={cn(
                "min-h-9 flex-1 text-caption font-medium transition-colors",
                tab === value
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              {value === "register" ? "Register" : "Sign in"}
            </button>
          ))}
        </div>

        {formError ? (
          <p className="text-caption text-danger" role="alert">
            {formError}
          </p>
        ) : null}

        {tab === "register" ? (
          <form className="space-y-3" onSubmit={handleRegister} noValidate>
            <Field label="Full name" htmlFor="b2b-name" error={errors.fullName}>
              <Input
                id="b2b-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Shop name" htmlFor="b2b-shop" error={errors.shopName}>
              <Input
                id="b2b-shop"
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
              />
            </Field>
            <Field
              label="Shop address"
              htmlFor="b2b-address"
              error={errors.shopAddress}
            >
              <Input
                id="b2b-address"
                value={shopAddress}
                onChange={(event) => setShopAddress(event.target.value)}
              />
            </Field>
            <Field
              label="Trade licence"
              htmlFor="b2b-trade"
              error={errors.tradeLicence}
            >
              <Input
                id="b2b-trade"
                type="file"
                accept="image/*,.pdf"
                onChange={(event) =>
                  setTradeLicenceFileName(
                    event.target.files?.[0]?.name ?? "",
                  )
                }
              />
            </Field>
            <Field label="NID image" htmlFor="b2b-nid" error={errors.nid}>
              <Input
                id="b2b-nid"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setNidFileName(event.target.files?.[0]?.name ?? "")
                }
              />
            </Field>
            <Field label="Phone" htmlFor="b2b-phone" error={errors.phone}>
              <Input
                id="b2b-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
              />
            </Field>
            <Field label="Email" htmlFor="b2b-email" error={errors.email}>
              <Input
                id="b2b-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field label="Password" htmlFor="b2b-password" error={errors.password}>
              <Input
                id="b2b-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field
              label="Confirm password"
              htmlFor="b2b-confirm"
              error={errors.confirmPassword}
            >
              <Input
                id="b2b-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit" className="w-full">
              Register for wholesale
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleLogin} noValidate>
            <Field label="Email" htmlFor="b2b-login-email" error={errors.email}>
              <Input
                id="b2b-login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field
              label="Password"
              htmlFor="b2b-login-password"
              error={errors.password}
            >
              <Input
                id="b2b-login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Button type="submit" className="w-full">
              Sign in for wholesale
            </Button>
          </form>
        )}
      </div>
    </Dialog>
  );
}

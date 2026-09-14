"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { createCustomerAction } from "@/features/admin/customers/customer-actions";

export function AdminCustomerForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError("Enter a customer name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number.");
      return;
    }
    if (!password.trim()) {
      setError("Enter a password for the new customer.");
      return;
    }

    startTransition(async () => {
      const result = await createCustomerAction({
        fullName,
        email,
        phone,
        password,
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the customer.");
        return;
      }
      notifySuccess({
        title: "Customer created",
        description: fullName.trim(),
      });
      router.push(`/admin/customers/${result.id}`);
    });
  }

  return (
    <form
      onSubmit={handleSave}
      className="mx-auto max-w-3xl space-y-5 pb-10"
    >
      <div>
        <p className="text-caption font-medium text-primary">
          <Link href="/admin/customers" className="hover:underline">
            Customers
          </Link>
          <span className="text-text-muted"> / New</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-800">
          Add new customer
        </h1>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <AdminFormCard title="Customer information">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="customer-name" required>
            Name
          </AdminFormLabel>
          <Input
            id="customer-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="customer-email" required>
            Email address
          </AdminFormLabel>
          <Input
            id="customer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="customer-phone" required>
            Phone
          </AdminFormLabel>
          <Input
            id="customer-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01XXXXXXXXX"
            className={adminFormControlClass}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="customer-password" required>
            Password
          </AdminFormLabel>
          <Input
            id="customer-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={adminFormControlClass}
            autoComplete="new-password"
            disabled={pending}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/admin/customers"
            className={buttonClassName({
              variant: "ghost",
              className: "border border-neutral-200",
            })}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={pending}
            className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </AdminFormCard>
    </form>
  );
}

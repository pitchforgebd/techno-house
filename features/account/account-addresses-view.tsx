"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { AccountShell } from "@/features/account/account-shell";
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
} from "@/features/account/address-actions";
import {
  ADDRESS_AREA_MAX,
  ADDRESS_CITY_MAX,
  ADDRESS_LABEL_MAX,
  ADDRESS_LINE_MAX,
  ADDRESS_NAME_MAX,
  ADDRESS_PHONE_MAX,
  ADDRESS_POSTCODE_MAX,
  type CustomerAddress,
} from "@/lib/account/address-limits";
import { cn } from "@/lib/cn";

type Draft = {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  area: string;
  city: string;
  postcode: string;
  isDefault: boolean;
};

const EMPTY: Draft = {
  label: "",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  area: "",
  city: "",
  postcode: "",
  isDefault: false,
};

function toDraft(address: CustomerAddress): Draft {
  return {
    label: address.label ?? "",
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    area: address.area ?? "",
    city: address.city,
    postcode: address.postcode ?? "",
    isDefault: address.isDefault,
  };
}

export function AccountAddressesView({
  addresses,
}: {
  addresses: CustomerAddress[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = draft !== null;

  function startCreate() {
    setEditingId(null);
    setDraft(EMPTY);
    setFormError(null);
    setErrorField(null);
  }

  function startEdit(address: CustomerAddress) {
    setEditingId(address.id);
    setDraft(toDraft(address));
    setFormError(null);
    setErrorField(null);
  }

  function close() {
    setDraft(null);
    setEditingId(null);
    setFormError(null);
    setErrorField(null);
  }

  function patch(next: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setFormError(null);
    setErrorField(null);
    startTransition(async () => {
      const result = await saveAddressAction({
        id: editingId ?? undefined,
        fields: draft,
      });
      if (!result.ok) {
        setFormError(result.formError);
        setFieldError(result.formError);
        setErrorField(result.field ?? null);
        return;
      }
      notifySuccess(editingId ? "Address updated" : "Address saved");
      close();
      router.refresh();
    });
  }

  function remove(address: CustomerAddress) {
    startTransition(async () => {
      const result = await deleteAddressAction(address.id);
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      notifySuccess("Address deleted");
      router.refresh();
    });
  }

  function makeDefault(address: CustomerAddress) {
    startTransition(async () => {
      const result = await setDefaultAddressAction(address.id);
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      notifySuccess("Default address updated");
      router.refresh();
    });
  }

  return (
    <AccountShell title="Addresses">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-prose text-label leading-relaxed text-text-muted">
            Saved delivery addresses. The default one is the address we reach
            for first — you can still change it at checkout.
          </p>
          {!open ? (
            <Button size="sm" onClick={startCreate} className="gap-1.5">
              <Plus aria-hidden strokeWidth={2} className="size-4" />
              Add address
            </Button>
          ) : null}
        </div>

        {formError && !open ? (
          <Alert tone="danger" title="Could not complete that">
            <p className="text-caption">{formError}</p>
          </Alert>
        ) : null}

        {open && draft ? (
          <form
            onSubmit={submit}
            className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6"
          >
            <h2 className="text-lg font-semibold tracking-tight text-text">
              {editingId ? "Edit address" : "New address"}
            </h2>

            {formError ? (
              <Alert tone="danger" title="Could not save" className="mt-4">
                <p className="text-caption">{formError}</p>
              </Alert>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Label" htmlFor="addr-label" hint="Home, Office…">
                <Input
                  id="addr-label"
                  value={draft.label}
                  maxLength={ADDRESS_LABEL_MAX}
                  onChange={(e) => patch({ label: e.target.value })}
                  disabled={pending}
                />
              </Field>
              <Field
                label="Recipient name"
                htmlFor="addr-name"
                error={errorField === "fullName" ? (fieldError ?? undefined) : undefined}
              >
                <Input
                  id="addr-name"
                  value={draft.fullName}
                  maxLength={ADDRESS_NAME_MAX}
                  autoComplete="name"
                  onChange={(e) => patch({ fullName: e.target.value })}
                  disabled={pending}
                  required
                />
              </Field>
              <Field
                label="Phone"
                htmlFor="addr-phone"
                error={errorField === "phone" ? (fieldError ?? undefined) : undefined}
              >
                <Input
                  id="addr-phone"
                  value={draft.phone}
                  maxLength={ADDRESS_PHONE_MAX}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  onChange={(e) => patch({ phone: e.target.value })}
                  disabled={pending}
                  required
                />
              </Field>
              <Field label="Area" htmlFor="addr-area" hint="Optional">
                <Input
                  id="addr-area"
                  value={draft.area}
                  maxLength={ADDRESS_AREA_MAX}
                  onChange={(e) => patch({ area: e.target.value })}
                  disabled={pending}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Street address"
                  htmlFor="addr-line1"
                  error={
                    errorField === "addressLine1" ? (fieldError ?? undefined) : undefined
                  }
                >
                  <Input
                    id="addr-line1"
                    value={draft.addressLine1}
                    maxLength={ADDRESS_LINE_MAX}
                    autoComplete="address-line1"
                    onChange={(e) => patch({ addressLine1: e.target.value })}
                    disabled={pending}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Apartment, floor, landmark"
                  htmlFor="addr-line2"
                  hint="Optional"
                >
                  <Input
                    id="addr-line2"
                    value={draft.addressLine2}
                    maxLength={ADDRESS_LINE_MAX}
                    autoComplete="address-line2"
                    onChange={(e) => patch({ addressLine2: e.target.value })}
                    disabled={pending}
                  />
                </Field>
              </div>
              <Field
                label="City"
                htmlFor="addr-city"
                error={errorField === "city" ? (fieldError ?? undefined) : undefined}
              >
                <Input
                  id="addr-city"
                  value={draft.city}
                  maxLength={ADDRESS_CITY_MAX}
                  autoComplete="address-level2"
                  onChange={(e) => patch({ city: e.target.value })}
                  disabled={pending}
                  required
                />
              </Field>
              <Field label="Postcode" htmlFor="addr-postcode" hint="Optional">
                <Input
                  id="addr-postcode"
                  value={draft.postcode}
                  maxLength={ADDRESS_POSTCODE_MAX}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  onChange={(e) => patch({ postcode: e.target.value })}
                  disabled={pending}
                />
              </Field>
            </div>

            <label className="mt-4 flex items-center gap-2.5 text-label text-text">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(e) => patch({ isDefault: e.target.checked })}
                disabled={pending}
                className="size-4 rounded border-border accent-[var(--color-primary)]"
              />
              Use as my default delivery address
            </label>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : editingId ? "Save changes" : "Save address"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="border border-border"
                onClick={close}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {addresses.length === 0 && !open ? (
          <EmptyState
            title="No saved addresses"
            description="Save an address once and it is ready the next time you check out."
            action={
              <Button size="sm" onClick={startCreate}>
                Add your first address
              </Button>
            }
          />
        ) : null}

        {addresses.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {addresses.map((address) => (
              <li key={address.id}>
                <article
                  className={cn(
                    "flex h-full flex-col rounded-lg border bg-surface p-4 transition-colors sm:p-5",
                    address.isDefault
                      ? "border-primary/45 ring-1 ring-primary/15"
                      : "border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-label font-semibold text-text">
                      <MapPin
                        aria-hidden
                        strokeWidth={1.75}
                        className="size-4 shrink-0 text-primary"
                      />
                      {address.label || "Delivery address"}
                    </span>
                    {address.isDefault ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-primary uppercase">
                        <Star aria-hidden className="size-3 fill-primary" />
                        Default
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-0.5 text-label leading-relaxed text-text-muted">
                    <p className="font-medium text-text">{address.fullName}</p>
                    <p>{address.phone}</p>
                    <p>
                      {address.addressLine1}
                      {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                    </p>
                    <p>
                      {[address.area, address.city, address.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-border/70 pt-3.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 border border-border"
                      onClick={() => startEdit(address)}
                      disabled={pending}
                    >
                      <Pencil aria-hidden strokeWidth={2} className="size-3.5" />
                      Edit
                    </Button>
                    {!address.isDefault ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 border border-border"
                        onClick={() => makeDefault(address)}
                        disabled={pending}
                      >
                        <Star aria-hidden strokeWidth={2} className="size-3.5" />
                        Make default
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto gap-1.5 text-danger hover:bg-danger/10"
                      onClick={() => remove(address)}
                      disabled={pending}
                    >
                      <Trash2 aria-hidden strokeWidth={2} className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </AccountShell>
  );
}

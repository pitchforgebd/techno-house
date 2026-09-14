"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import {
  createRefundReasonAction,
  deleteRefundReasonAction,
  saveRefundPolicyAction,
  uploadRefundStickerAction,
} from "@/features/admin/refunds/refund-settings-actions";
import type {
  RefundPolicySettings,
  RefundReasonRow,
} from "@/lib/refunds/settings";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function SettingsCard({
  title,
  description,
  children,
  onSave,
  saving,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
      {onSave ? (
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="bg-[#3897f0] hover:bg-[#2f86d8]"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function DaysInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <div className="flex">
        <Input
          id={id}
          type="number"
          min={0}
          value={value}
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === "" ? "" : Number(raw));
          }}
          className={cn(controlClass, "rounded-r-none")}
        />
        <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 border-neutral-200 bg-neutral-100 px-3 text-sm text-neutral-600">
          Days
        </span>
      </div>
    </div>
  );
}

export function AdminRefundSettings({
  initialSettings,
  initialReasons,
}: {
  initialSettings: RefundPolicySettings;
  initialReasons: RefundReasonRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState(initialSettings);
  const [reasons, setReasons] = useState(initialReasons);

  const customerReasons = reasons.filter(
    (row) => row.type === "customer" && row.isActive,
  );
  const rejectReasons = reasons.filter(
    (row) => row.type === "admin_reject" && row.isActive,
  );

  function persistPolicy(
    next: RefundPolicySettings,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await saveRefundPolicyAction({
        refundType: next.refundType,
        globalRefundDays: next.globalRefundDays,
        disputeEnabled: next.disputeEnabled,
        disputeDays: next.disputeDays,
        stickerSrc: next.stickerSrc,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setSettings(next);
      notifySuccess(successMessage);
      router.refresh();
    });
  }

  function addReason(type: "customer" | "admin_reject") {
    const label =
      type === "customer"
        ? "New customer refund reason"
        : "New admin reject reason";
    const next = window.prompt(label);
    if (!next?.trim()) {
      return;
    }
    startTransition(async () => {
      const result = await createRefundReasonAction({
        type,
        reason: next.trim(),
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setReasons((list) => [
        ...list,
        {
          id: result.id,
          type,
          reason: next.trim(),
          isActive: true,
        },
      ]);
      notifySuccess("Reason saved");
      router.refresh();
    });
  }

  function removeReason(id: string) {
    startTransition(async () => {
      const result = await deleteRefundReasonAction({ id });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setReasons((list) =>
        list.map((row) =>
          row.id === id ? { ...row, isActive: false } : row,
        ),
      );
      notifySuccess("Reason removed");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Refund settings
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Single-vendor refund rules saved to the database
        </p>
      </div>

      <SettingsCard
        title="Refund type"
        description="When Global Refund is enabled, the refund period applies to all products. Category-based refund applies per category."
        saving={pending}
        onSave={() => persistPolicy(settings, "Refund type saved")}
      >
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input
            type="radio"
            name="refund-type"
            checked={settings.refundType === "global"}
            onChange={() =>
              setSettings((current) => ({ ...current, refundType: "global" }))
            }
            className="accent-[#3897f0]"
          />
          Global refund
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input
            type="radio"
            name="refund-type"
            checked={settings.refundType === "category"}
            onChange={() =>
              setSettings((current) => ({
                ...current,
                refundType: "category",
              }))
            }
            className="accent-[#3897f0]"
          />
          Category based refund
        </label>
        <p className="text-sm text-red-500">
          Switching refund type is a core setting and may mark products as
          non-refundable until updated. Category refund times may need
          reconfiguration.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Set refund time"
        description="When Global Refund is enabled, set the refund days here."
        saving={pending}
        onSave={() => persistPolicy(settings, "Refund time saved")}
      >
        <DaysInput
          id="global-days"
          label="Set time for sending refund request"
          value={settings.globalRefundDays}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              globalRefundDays: value === "" ? 0 : value,
            }))
          }
        />
      </SettingsCard>

      <SettingsCard
        title="Dispute refund option"
        description="Allow customers to resubmit rejected refund requests with reasons and images. Disputes go directly to admin."
      >
        <div className="flex items-center gap-3">
          <AdminToggleSwitch
            label="Enable dispute"
            checked={settings.disputeEnabled}
            onChange={(checked) => {
              const next = { ...settings, disputeEnabled: checked };
              setSettings(next);
              persistPolicy(
                next,
                checked ? "Dispute refund enabled" : "Dispute refund disabled",
              );
            }}
          />
          <span className="text-sm font-medium text-neutral-800">
            Enable dispute
          </span>
        </div>
        <p className="text-sm text-red-500">
          Orders placed when dispute is enabled still follow the dispute time
          limit even if it is turned off later.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Set dispute refund time"
        description="This time limit is global and is added to the standard refund period."
        saving={pending}
        onSave={() => persistPolicy(settings, "Dispute time saved")}
      >
        <DaysInput
          id="dispute-days"
          label="Set time for sending dispute refund request"
          value={settings.disputeDays}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              disputeDays: value === "" ? 0 : value,
            }))
          }
        />
      </SettingsCard>

      <SettingsCard
        title="Customer preset refund reason"
        description="These refund reasons will be shown to customers when submitting a refund request."
      >
        <ul className="space-y-2">
          {customerReasons.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm"
            >
              <span>{row.reason}</span>
              <button
                type="button"
                aria-label={`Remove ${row.reason}`}
                disabled={pending}
                onClick={() => removeReason(row.id)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={pending}
          onClick={() => addReason("customer")}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-300 py-6 text-sm font-medium text-[#3897f0] hover:bg-blue-50/40"
        >
          <Plus className="size-4" aria-hidden />
          Add new reason
        </button>
      </SettingsCard>

      <SettingsCard
        title="Admin preset reject refund reason"
        description="These reasons are shown while reviewing refund requests for rejection."
      >
        <ul className="space-y-2">
          {rejectReasons.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm"
            >
              <span>{row.reason}</span>
              <button
                type="button"
                aria-label={`Remove ${row.reason}`}
                disabled={pending}
                onClick={() => removeReason(row.id)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={pending}
          onClick={() => addReason("admin_reject")}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-300 py-6 text-sm font-medium text-[#3897f0] hover:bg-blue-50/40"
        >
          <Plus className="size-4" aria-hidden />
          Add new reason
        </button>
      </SettingsCard>

      <SettingsCard
        title="Set refund sticker"
        description="This sticker will be displayed on the product details page."
        saving={pending}
        onSave={() => persistPolicy(settings, "Refund sticker saved")}
      >
        <p className="text-sm font-medium text-neutral-700">Add sticker</p>
        <input
          ref={stickerInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) {
              return;
            }
            const formData = new FormData();
            formData.set("file", file);
            startTransition(async () => {
              const result = await uploadRefundStickerAction(formData);
              if (!result.ok) {
                notifyError(result.formError);
                return;
              }
              if (result.path) {
                setSettings((current) => ({
                  ...current,
                  stickerSrc: result.path ?? null,
                }));
              }
              notifySuccess("Sticker uploaded");
              router.refresh();
            });
          }}
        />
        <div className="flex flex-wrap gap-3">
          {settings.stickerSrc ? (
            <div className="relative flex w-28 flex-col items-center rounded-md border border-neutral-200 bg-neutral-50 p-2">
              <button
                type="button"
                aria-label="Remove sticker"
                disabled={pending}
                onClick={() => {
                  const next = { ...settings, stickerSrc: null };
                  setSettings(next);
                  persistPolicy(next, "Sticker removed");
                }}
                className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-orange-500 text-white"
              >
                <X className="size-3" aria-hidden />
              </button>
              <Image
                src={settings.stickerSrc}
                alt="Refund sticker"
                width={64}
                height={64}
                className="size-16 object-contain"
                unoptimized
              />
              <span className="mt-1 truncate text-[0.65rem] text-neutral-500">
                sticker
              </span>
            </div>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => stickerInputRef.current?.click()}
            className="flex size-28 items-center justify-center rounded-md border border-dashed border-neutral-300 text-neutral-400 hover:bg-neutral-50"
            aria-label="Upload sticker"
          >
            <Plus className="size-6" aria-hidden />
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}

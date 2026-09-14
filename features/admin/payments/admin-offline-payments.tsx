"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { saveOfflinePaymentAction } from "@/features/admin/payments/offline-emi-actions";
import type { AdminOfflinePaymentConfig } from "@/lib/payments/offline-config";

const controlClass =
  "h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminOfflinePayments({
  initial,
}: {
  initial: AdminOfflinePaymentConfig;
}) {
  const [codEnabled, setCodEnabled] = useState(initial.codEnabled);
  const [label, setLabel] = useState(initial.label);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveOfflinePaymentAction({
        codEnabled,
        label,
        instructions,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Offline payments saved");
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Offline payments
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cash on delivery and other offline checkout options.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            Cash on delivery
          </h2>
          <AdminToggleSwitch
            label="Enable cash on delivery"
            checked={codEnabled}
            onChange={setCodEnabled}
          />
        </div>
        <div className="space-y-4 px-5 py-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-800">
              Display label
            </span>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={controlClass}
              disabled={pending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-800">
              Customer instructions
            </span>
            <Input
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className={controlClass}
              disabled={pending}
            />
          </label>
        </div>
        <div className="flex justify-end px-5 pb-5">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-[#3897f0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2f86d8] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
}

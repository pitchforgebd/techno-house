"use client";

import { useState, useTransition } from "react";
import {
  AdminToggleRow,
  AdminToggleSwitch,
} from "@/features/admin/products/admin-toggle-switch";
import { Textarea } from "@/components/ui/textarea";
import { notifyError } from "@/components/ui/feedback-provider";
import {
  FieldRow,
  Input,
  InstructionCard,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { saveEmiSettingsAction } from "@/features/admin/payments/offline-emi-actions";
import { EMI_TENURE_OPTIONS, type AdminEmiConfig } from "@/lib/payments/emi-shared";

const TENURE_OPTIONS = EMI_TENURE_OPTIONS.map((months) => ({
  months,
  label: `${months} months`,
}));

export function AdminEmiSettings({ initial }: { initial: AdminEmiConfig }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [tenures, setTenures] = useState<Record<number, boolean>>(
    Object.fromEntries(
      EMI_TENURE_OPTIONS.map((m) => [m, initial.tenureMonths.includes(m)]),
    ),
  );
  const [partnerName, setPartnerName] = useState(initial.partnerName);
  const [interestNote, setInterestNote] = useState(initial.interestNote);
  const [minOrderAmount, setMinOrderAmount] = useState(
    String(initial.minOrderAmount),
  );
  const [pending, startTransition] = useTransition();

  function toggleTenure(months: number) {
    setTenures((current) => ({ ...current, [months]: !current[months] }));
  }

  function save() {
    startTransition(async () => {
      const result = await saveEmiSettingsAction({
        enabled,
        tenureMonths: EMI_TENURE_OPTIONS.filter((m) => tenures[m]),
        partnerName,
        interestNote,
        minOrderAmount,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("EMI settings saved");
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          EMI Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure storefront EMI messaging on product pages.
        </p>
      </div>

      <SetupCard
        title="EMI checkout"
        hint="Matches PDP EMI teaser and offer row."
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save"}
      >
        <AdminToggleRow
          label="Enable EMI on storefront"
          checked={enabled}
          onChange={setEnabled}
        />
      </SetupCard>

      <SetupCard title="Tenure options">
        <div className="divide-y divide-neutral-100">
          {TENURE_OPTIONS.map(({ months, label }) => (
            <div
              key={months}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm font-medium text-neutral-800">
                {label}
              </span>
              <AdminToggleSwitch
                label={`Enable ${label} EMI`}
                checked={tenures[months] ?? false}
                onChange={() => toggleTenure(months)}
                activeClassName="bg-[#6c5ce7]"
              />
            </div>
          ))}
        </div>
      </SetupCard>

      <SetupCard
        title="Partner & eligibility"
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save"}
      >
        <FieldRow label="Bank / partner name">
          <Input
            value={partnerName}
            onChange={(event) => setPartnerName(event.target.value)}
            className={controlClass}
            disabled={pending}
          />
        </FieldRow>
        <FieldRow
          label="Interest note"
          hint="Shown near EMI offer on PDP"
        >
          <Textarea
            rows={3}
            value={interestNote}
            onChange={(event) => setInterestNote(event.target.value)}
            className={controlClass}
            disabled={pending}
          />
        </FieldRow>
        <FieldRow label="Minimum order amount (BDT)">
          <Input
            type="number"
            min={0}
            value={minOrderAmount}
            onChange={(event) => setMinOrderAmount(event.target.value)}
            className={controlClass}
            disabled={pending}
          />
        </FieldRow>
      </SetupCard>

      <InstructionCard title="Storefront alignment">
        <p>
          PDP divides price by 12 for the monthly EMI line and by 11 for the
          offer row, and only shows the teaser when EMI is enabled and the
          product price meets the minimum order amount. No EMI
          lender/approval backend exists — this only controls what displays.
        </p>
      </InstructionCard>
    </div>
  );
}

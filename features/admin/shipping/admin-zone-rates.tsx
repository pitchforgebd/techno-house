"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  FieldRow,
  Input,
  SetupCard,
  controlClass,
} from "@/features/admin/settings/setup-ui";
import { saveZoneRateAction } from "@/features/admin/shipping/zone-rate-actions";
import type { AdminZoneRate } from "@/lib/shipping/zone-rates";

function ZoneRateCard({ zone }: { zone: AdminZoneRate }) {
  const router = useRouter();
  const [baseWeightGrams, setBaseWeightGrams] = useState(
    String(zone.baseWeightGrams),
  );
  const [baseRateAmount, setBaseRateAmount] = useState(
    String(zone.baseRateAmount),
  );
  const [extraRatePerKgAmount, setExtraRatePerKgAmount] = useState(
    String(zone.extraRatePerKgAmount),
  );
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveZoneRateAction({
        id: zone.id,
        baseWeightGrams,
        baseRateAmount,
        extraRatePerKgAmount,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(`${zone.name} rate saved`);
      router.refresh();
    });
  }

  const previewKg = Math.max(
    1,
    Math.ceil(Number(baseWeightGrams || 0) / 1000) + 1,
  );

  return (
    <SetupCard
      title={zone.name}
      onSave={save}
      saveLabel={pending ? "Saving…" : "Save"}
    >
      <FieldRow
        label="Base weight (grams)"
        hint="The rate below covers up to this weight"
      >
        <Input
          type="number"
          min={1}
          className={controlClass}
          value={baseWeightGrams}
          onChange={(e) => setBaseWeightGrams(e.target.value)}
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="Base rate (৳)">
        <Input
          type="number"
          min={0}
          className={controlClass}
          value={baseRateAmount}
          onChange={(e) => setBaseRateAmount(e.target.value)}
          disabled={pending}
        />
      </FieldRow>
      <FieldRow
        label="Extra per additional kg (৳)"
        hint="Charged per kg beyond the base weight, rounded up"
      >
        <Input
          type="number"
          min={0}
          className={controlClass}
          value={extraRatePerKgAmount}
          onChange={(e) => setExtraRatePerKgAmount(e.target.value)}
          disabled={pending}
        />
      </FieldRow>
      <p className="text-xs text-neutral-500">
        Example: a {previewKg}kg order costs ৳
        {Number(baseRateAmount || 0) + Number(extraRatePerKgAmount || 0)}.
      </p>
    </SetupCard>
  );
}

export function AdminZoneRates({ zones }: { zones: AdminZoneRate[] }) {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Shipping Rates
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Weight-based rate per zone. Checkout sums the weight of everything
          in the cart and charges the base rate plus extra per additional kg,
          based on which zone the customer&apos;s selected district maps to.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {zones.map((zone) => (
          <ZoneRateCard key={zone.id} zone={zone} />
        ))}
      </div>
    </div>
  );
}

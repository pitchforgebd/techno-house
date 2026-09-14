"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { AdminPcBuilderSubnav } from "@/features/admin/pc-builder/admin-pc-builder-subnav";
import {
  AdminToggleRow,
  AdminToggleSwitch,
} from "@/features/admin/products/admin-toggle-switch";
import {
  savePcBuilderEnabledAction,
  savePcBuilderSlotsAction,
} from "@/features/admin/pc-builder/settings-actions";
import { InstructionCard, SetupCard, notifySuccess } from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";

/** Mirrors AdminPcBuilderSlotSetting/AdminPcBuilderSettings in lib/pc-builder/settings.ts (server-only, not importable from a client component). */
type SlotConfig = {
  id: string;
  label: string;
  enabled: boolean;
  required: boolean;
};

export function AdminPcBuilderSettings({
  settings,
}: {
  settings: { enabled: boolean; slots: SlotConfig[] };
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [slots, setSlots] = useState<SlotConfig[]>(settings.slots);
  const [savingEnabled, startSavingEnabled] = useTransition();
  const [savingSlots, startSavingSlots] = useTransition();

  function updateSlot(
    id: string,
    patch: Partial<Pick<SlotConfig, "enabled" | "required">>,
  ) {
    setSlots((current) =>
      current.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)),
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-4">
          <AdminPcBuilderSubnav />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              PC Builder
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Real settings that take effect on the live storefront. Turning
              the builder off shows customers an unavailable page instead;
              disabling a slot removes it from the picker and the required
              count; a slot marked required blocks add-to-cart until it&apos;s
              filled. Compatibility rules persist under the Rules tab and
              also affect the live storefront.
            </p>
          </div>
        </div>
        <Link
          href="/pc-builder"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6c5ce7] hover:underline"
        >
          View storefront builder
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>

      <SetupCard
        title="PC Builder"
        hint="Enable or disable the storefront PC Builder experience."
        onSave={() => {
          startSavingEnabled(async () => {
            const result = await savePcBuilderEnabledAction({ enabled });
            if (!result.ok) {
              notifyError(result.formError);
              return;
            }
            notifySuccess("PC Builder setting saved");
            router.refresh();
          });
        }}
        saveLabel={savingEnabled ? "Saving…" : "Save"}
      >
        <AdminToggleRow
          label="Enable PC Builder"
          checked={enabled}
          onChange={setEnabled}
        />
      </SetupCard>

      <SetupCard
        title="Component slots"
        onSave={() => {
          startSavingSlots(async () => {
            const result = await savePcBuilderSlotsAction({
              slots: slots.map((s) => ({ id: s.id, enabled: s.enabled, required: s.required })),
            });
            if (!result.ok) {
              notifyError(result.formError);
              return;
            }
            notifySuccess("Component slots saved");
            router.refresh();
          });
        }}
        saveLabel={savingSlots ? "Saving…" : "Save"}
      >
        <div className="divide-y divide-neutral-100">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span className="min-w-[6rem] text-sm font-medium text-neutral-800">
                {slot.label}
              </span>
              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <span>Enabled</span>
                  <AdminToggleSwitch
                    label={`${slot.label} enabled`}
                    checked={slot.enabled}
                    onChange={(checked) =>
                      updateSlot(slot.id, { enabled: checked })
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <span>Required</span>
                  <AdminToggleSwitch
                    label={`${slot.label} required`}
                    checked={slot.required}
                    onChange={(checked) =>
                      updateSlot(slot.id, { required: checked })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </SetupCard>

      <InstructionCard title="Compatibility rules">
        <p>Socket matching enforced between CPU, motherboard, and cooler.</p>
        <p>RAM type must match motherboard support (DDR4 / DDR5).</p>
        <p>PSU wattage checked against CPU and GPU power draw.</p>
        <p>Case form factor validated against motherboard size.</p>
        <p>
          These are real and live — manage them on the{" "}
          <Link href="/admin/pc-builder/rules" className="font-medium text-[#3897f0] hover:underline">
            Compatibility rules
          </Link>{" "}
          tab.
        </p>
      </InstructionCard>
    </div>
  );
}

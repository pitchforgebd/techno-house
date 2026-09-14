"use client";

import { useState, useTransition } from "react";
import {
  AdminToggleSwitch,
  SetupCard,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import { saveFeatureFlagsAction } from "@/features/admin/settings/feature-flags-actions";
import {
  FEATURE_FLAG_SECTIONS,
  type FeatureFlagItem,
} from "@/lib/admin/feature-flags-shared";

function FeatureCard({
  item,
  checked,
  onChange,
  disabled,
}: {
  item: FeatureFlagItem;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <article className="relative rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="absolute right-4 top-4">
        <AdminToggleSwitch
          label={item.title}
          checked={checked}
          onChange={onChange}
          activeClassName="bg-emerald-500"
          disabled={disabled}
        />
      </div>
      <div className="flex gap-4 pr-14">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-lg font-semibold text-neutral-600">
          {item.icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-neutral-900">{item.title}</h3>
          <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
          {item.oauthHint ? (
            <p className="mt-2 text-xs font-medium text-amber-600">
              OAuth sign-in isn&apos;t implemented yet — this switch has no
              effect.
            </p>
          ) : item.statusNote ? (
            <p className="mt-2 text-xs font-medium text-amber-600">
              {item.statusNote}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function AdminFeatureFlags({
  initial,
}: {
  initial: Record<string, boolean>;
}) {
  const [flags, setFlags] = useState<Record<string, boolean>>(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveFeatureFlagsAction({ flags });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Feature activation saved");
    });
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Feature Activation
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Customize how the business operates
        </p>
      </div>

      {FEATURE_FLAG_SECTIONS.map((section) => (
        <section key={section.id} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {section.title}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {section.items.map((item) => (
              <FeatureCard
                key={item.id}
                item={item}
                checked={flags[item.id] ?? item.defaultEnabled}
                disabled={pending}
                onChange={(checked) =>
                  setFlags((current) => ({ ...current, [item.id]: checked }))
                }
              />
            ))}
          </div>
        </section>
      ))}

      <SetupCard
        title="Save changes"
        hint="Most switches take effect immediately on the live storefront. A few have an amber note explaining why they don't yet — see each card above."
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save activation"}
      >
        <p className="text-sm text-neutral-500">
          Maintenance Mode, Pickup point, Billing Address, Product Query
          Q&amp;A, and Coupon System are enforced live. Flags marked in amber
          above either have no real feature to gate yet or are superseded by
          a more specific setting elsewhere.
        </p>
      </SetupCard>
    </div>
  );
}

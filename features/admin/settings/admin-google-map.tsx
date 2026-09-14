"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AdminToggleSwitch,
  FieldRow,
  InstructionCard,
  SetupBackLink,
  SetupCard,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import { saveGoogleMapConfigAction } from "@/features/admin/settings/maps-chat-actions";
import type { AdminGoogleMapConfig } from "@/lib/maps/config";

export function AdminGoogleMapSettings({
  config,
}: {
  config: AdminGoogleMapConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(config.isEnabled);

  function save() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveGoogleMapConfigAction({ isEnabled: enabled });
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess("Google Map settings saved");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <SetupBackLink href="/admin/settings/google" label="Back to Google" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Google Map
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enable flag for a future Maps JavaScript / Places integration. The API
          key stays in the environment.
        </p>
      </div>

      <SetupCard
        title="Google Map Setting"
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save"}
      >
        {formError ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <FieldRow label="Google Map">
          <AdminToggleSwitch
            label="Google Map"
            checked={enabled}
            onChange={setEnabled}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
      </SetupCard>

      <InstructionCard>
        <p>Enable Maps JavaScript API and Places API in Google Cloud.</p>
        <p>
          Set <code className="text-sky-950">GOOGLE_MAPS_API_KEY</code> in the
          environment — never store it in the database. Restrict the key to your
          storefront domains in production. Live map widgets are deferred.
        </p>
      </InstructionCard>
    </div>
  );
}

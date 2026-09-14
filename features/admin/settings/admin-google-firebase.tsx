"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AdminToggleSwitch,
  InstructionCard,
  SetupBackLink,
  SetupCard,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import { saveFirebaseConfigAction } from "@/features/admin/settings/social-actions";
import type { AdminFirebaseConfig } from "@/lib/social/firebase-config";

export function AdminGoogleFirebaseSettings({
  config,
}: {
  config: AdminFirebaseConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(config.isEnabled);

  function save() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveFirebaseConfigAction({ isEnabled: enabled });
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess("Firebase settings saved");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <SetupBackLink href="/admin/settings/google" label="Back to Google" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Google Firebase
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enable flag for a future push / mobile analytics connection. Project
          credentials stay in the environment.
        </p>
      </div>

      <SetupCard
        title="Google Firebase Setting"
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save"}
      >
        {formError ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-800">
              Enable Firebase
            </p>
            <p className="text-xs text-neutral-500">
              Intent only until Firebase wiring exists.
            </p>
          </div>
          <AdminToggleSwitch
            label="Enable Firebase"
            checked={enabled}
            onChange={setEnabled}
            activeClassName="bg-emerald-500"
          />
        </div>
      </SetupCard>

      <InstructionCard>
        <p>
          Service account JSON and API keys never go in the database. Leave
          Firebase disabled until credentials are ready in env.
        </p>
      </InstructionCard>
    </div>
  );
}

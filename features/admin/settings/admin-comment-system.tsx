"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AdminToggleSwitch,
  FieldRow,
  Input,
  InstructionCard,
  Select,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import { saveCommentSystemConfigAction } from "@/features/admin/settings/maps-chat-actions";
import {
  COMMENT_PROVIDERS,
  type AdminCommentSystemConfig,
  type CommentProviderId,
} from "@/lib/comments/fields";

export function AdminCommentSystemSettings({
  config,
}: {
  config: AdminCommentSystemConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [provider, setProvider] = useState<CommentProviderId>(config.provider);
  const [publicAppId, setPublicAppId] = useState(config.publicAppId);

  function save() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveCommentSystemConfigAction({
        isEnabled: enabled,
        provider,
        publicAppId,
      });
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess("Comment settings saved");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Social comments
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Public plugin settings for a future blog or product comment embed. Raw
          scripts are never stored.
        </p>
      </div>

      <SetupCard
        title="Comment plugin"
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save Configuration"}
      >
        {formError ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <FieldRow label="Enable comments">
          <AdminToggleSwitch
            label="Enable comments"
            checked={enabled}
            onChange={setEnabled}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
        <FieldRow label="Provider">
          <Select
            className={controlClass}
            value={provider}
            onChange={(e) => {
              const next = COMMENT_PROVIDERS.find(
                (p) => p.value === e.target.value,
              );
              if (next) {
                setProvider(next.value);
              }
            }}
          >
            {COMMENT_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </FieldRow>
        <FieldRow label="Public app ID">
          <Input
            className={controlClass}
            value={publicAppId}
            onChange={(e) => setPublicAppId(e.target.value)}
            autoComplete="off"
            placeholder="Facebook App ID"
          />
        </FieldRow>
      </SetupCard>

      <InstructionCard>
        <p>
          Plugin embed wiring is deferred. Product Q&amp;A and reviews stay on
          the existing Techno House tables — this setting is for optional
          third-party comment plugins only.
        </p>
      </InstructionCard>
    </div>
  );
}

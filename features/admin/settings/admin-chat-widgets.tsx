"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AdminToggleSwitch,
  FieldRow,
  Input,
  InstructionCard,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import { saveChatWidgetConfigAction } from "@/features/admin/settings/maps-chat-actions";
import {
  CHAT_WIDGET_PROVIDERS,
  type AdminChatWidgetConfig,
} from "@/lib/chat/fields";

function WidgetCard({ config }: { config: AdminChatWidgetConfig }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = CHAT_WIDGET_PROVIDERS.find((p) => p.id === config.provider)!;
  const [isEnabled, setIsEnabled] = useState(config.isEnabled);
  const [publicHandle, setPublicHandle] = useState(config.publicHandle);
  const [formError, setFormError] = useState<string | null>(null);

  function save() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveChatWidgetConfigAction({
        provider: config.provider,
        isEnabled,
        publicHandle,
      });
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess(`${meta.title} saved`);
      router.refresh();
    });
  }

  return (
    <SetupCard
      title={meta.title}
      onSave={save}
      saveLabel={pending ? "Saving…" : "Save"}
    >
      {formError ? (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {formError}
        </p>
      ) : null}
      <FieldRow label="Enable">
        <AdminToggleSwitch
          label={`Enable ${meta.title}`}
          checked={isEnabled}
          onChange={setIsEnabled}
          activeClassName="bg-emerald-500"
        />
      </FieldRow>
      <FieldRow label={meta.handleLabel} hint={meta.handleHint}>
        <Input
          className={controlClass}
          value={publicHandle}
          onChange={(e) => setPublicHandle(e.target.value)}
          autoComplete="off"
        />
      </FieldRow>
    </SetupCard>
  );
}

export function AdminChatWidgetSettings({
  configs,
}: {
  configs: AdminChatWidgetConfig[];
}) {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Chat widgets
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Each enabled channel shows its own floating icon on the
          storefront — WhatsApp and Messenger stack together in the corner,
          and Tawk.to renders its own live chat widget alongside them.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {configs.map((config) => (
          <WidgetCard key={config.provider} config={config} />
        ))}
      </div>

      <InstructionCard title="Chat notes">
        <p>
          Tawk.to: create a free account at tawk.to, open Administration →
          Chat Widget, and copy the property id / widget id from your embed
          URL (embed.tawk.to/&lt;property id&gt;/&lt;widget id&gt;). Enable
          it here to show the real widget on every storefront page.
        </p>
        <p>
          WhatsApp: enter the number with country code or a leading 0 for
          Bangladesh (e.g. 01XXXXXXXXX becomes +880 1XXXXXXXXX) — a floating
          WhatsApp button appears on the storefront when enabled.
        </p>
        <p>
          Messenger: enter your public Facebook Page id or username — a
          floating Messenger button appears on the storefront when enabled.
        </p>
      </InstructionCard>
    </div>
  );
}

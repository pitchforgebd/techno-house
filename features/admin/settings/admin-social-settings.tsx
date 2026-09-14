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
import { saveSocialLoginConfigAction } from "@/features/admin/settings/social-actions";
import { SOCIAL_LOGIN_PROVIDERS } from "@/lib/social/login-fields";
import type { AdminSocialLoginConfig } from "@/lib/social/login-fields";

const REAL_OAUTH_PROVIDERS = new Set(["GOOGLE", "FACEBOOK"]);

function ProviderCard({
  config,
  origin,
}: {
  config: AdminSocialLoginConfig;
  origin: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = SOCIAL_LOGIN_PROVIDERS.find((p) => p.id === config.provider)!;
  const [isEnabled, setIsEnabled] = useState(config.isEnabled);
  const [publicClientId, setPublicClientId] = useState(config.publicClientId);
  const [formError, setFormError] = useState<string | null>(null);

  function save() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveSocialLoginConfigAction({
        provider: config.provider,
        isEnabled,
        publicClientId,
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
      <FieldRow label={meta.clientIdLabel}>
        <Input
          className={controlClass}
          value={publicClientId}
          onChange={(e) => setPublicClientId(e.target.value)}
          autoComplete="off"
        />
      </FieldRow>
      {REAL_OAUTH_PROVIDERS.has(config.provider) ? (
        <FieldRow label="Callback URL">
          <Input
            className={controlClass}
            value={`${origin}/api/auth/social/${config.provider.toLowerCase()}/callback`}
            readOnly
            onFocus={(e) => e.target.select()}
          />
        </FieldRow>
      ) : (
        <FieldRow label="Callback URL">
          <Input
            className={controlClass}
            value="Not built yet — Twitter/Apple need a non-standard OAuth flow"
            readOnly
          />
        </FieldRow>
      )}
      <p className="text-xs text-neutral-500">
        Secret: set <code className="text-neutral-700">{meta.secretEnvHint}</code>{" "}
        in the environment. Never stored in the database.{" "}
        {REAL_OAUTH_PROVIDERS.has(config.provider) ? (
          <>
            Real sign-in is live: register the callback URL above with{" "}
            {meta.title.replace(" Login", "")}, set the secret, and turn this on
            — the button on the login page activates automatically once all
            three are true.
          </>
        ) : (
          "Enabling this only stores intent — the sign-in flow itself isn't built yet."
        )}
      </p>
    </SetupCard>
  );
}

export function AdminSocialSettings({
  configs,
  origin,
}: {
  configs: AdminSocialLoginConfig[];
  origin: string;
}) {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Social Media Logins
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Google and Facebook sign-in are real: the button on the customer
          login page only activates once a provider is enabled here, has a
          client/app id, and its secret env var is set — all three, or it
          stays honestly disabled. Twitter and Apple need a non-standard OAuth
          flow (OAuth 1.0a / a JWT-generated client secret) and are not built
          yet.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {configs.map((config) => (
          <ProviderCard key={config.provider} config={config} origin={origin} />
        ))}
      </div>

      <InstructionCard title="Social login notes">
        <p>
          Client secrets never leave the environment. A first-time sign-in
          with a new Google/Facebook identity links or creates a customer
          account by matching the provider&apos;s verified email — the
          provider must confirm the email is verified, or sign-in is refused
          rather than risk linking to the wrong account.
        </p>
      </InstructionCard>
    </div>
  );
}

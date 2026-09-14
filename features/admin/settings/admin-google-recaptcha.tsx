"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AdminToggleSwitch,
  FieldRow,
  Input,
  InstructionCard,
  Select,
  SetupBackLink,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import { saveRecaptchaConfigAction } from "@/features/admin/settings/social-actions";
import {
  RECAPTCHA_PAGES,
  type AdminRecaptchaConfig,
  type RecaptchaPageId,
} from "@/lib/social/recaptcha-fields";

export function AdminGoogleRecaptchaSettings({
  config,
}: {
  config: AdminRecaptchaConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [siteKey, setSiteKey] = useState(config.siteKey);
  const [score, setScore] = useState(String(config.scoreThreshold));
  const [pages, setPages] = useState<Record<RecaptchaPageId, boolean>>(
    config.pages,
  );

  function save() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveRecaptchaConfigAction({
        isEnabled: enabled,
        siteKey,
        scoreThreshold: score,
        pages,
      });
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess("reCAPTCHA settings saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <SetupBackLink href="/admin/settings/google" label="Back to Google" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Google reCAPTCHA
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          v3 bot protection settings for a future form flow. Verification is not
          wired yet.
        </p>
      </div>

      <SetupCard
        title="reCAPTCHA Settings"
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save Configuration"}
      >
        {formError ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <FieldRow label="Enable reCAPTCHA">
          <AdminToggleSwitch
            label="Enable reCAPTCHA"
            checked={enabled}
            onChange={setEnabled}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
        <FieldRow label="Site key">
          <Input
            className={controlClass}
            value={siteKey}
            onChange={(e) => setSiteKey(e.target.value)}
            autoComplete="off"
          />
        </FieldRow>
        <FieldRow label="Accept V3 score">
          <Select
            className={controlClass}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          >
            <option value="0.3">0.3 — Lenient</option>
            <option value="0.5">0.5 — Balanced</option>
            <option value="0.7">0.7 — Strict</option>
          </Select>
        </FieldRow>
      </SetupCard>

      <InstructionCard>
        <p>Register your domain in Google reCAPTCHA admin console.</p>
        <p>
          Use reCAPTCHA v3 keys. Secret key stays in{" "}
          <code className="text-sky-950">RECAPTCHA_SECRET_KEY</code> — never the
          database.
        </p>
      </InstructionCard>

      <SetupCard
        title="Recaptcha Applicable Pages"
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save pages"}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RECAPTCHA_PAGES.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-4 py-3"
            >
              <span className="text-sm font-medium text-neutral-800">
                {page.label}
              </span>
              <AdminToggleSwitch
                label={page.label}
                checked={pages[page.id] ?? false}
                onChange={(checked) =>
                  setPages((current) => ({ ...current, [page.id]: checked }))
                }
                activeClassName="bg-emerald-500"
              />
            </div>
          ))}
        </div>
      </SetupCard>
    </div>
  );
}

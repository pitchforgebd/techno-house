"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FieldRow,
  Input,
  InstructionCard,
  Select,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import {
  saveSmtpConfigAction,
  sendTestEmailAction,
} from "@/features/admin/settings/smtp-actions";
import {
  SMTP_ENCRYPTION_OPTIONS,
  SMTP_MAILER_TYPES,
  type AdminSmtpConfig,
  type SmtpEncryption,
  type SmtpMailerType,
} from "@/lib/smtp/fields";

export function AdminSmtpSettings({ config }: { config: AdminSmtpConfig }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    mailerType: SmtpMailerType;
    host: string;
    port: string;
    username: string;
    encryption: SmtpEncryption;
    fromAddress: string;
    fromName: string;
  }>({
    mailerType: config.mailerType,
    host: config.host,
    port: String(config.port),
    username: config.username,
    encryption: config.encryption,
    fromAddress: config.fromAddress,
    fromName: config.fromName,
  });
  const [testEmail, setTestEmail] = useState("");
  const [testPending, startTest] = useTransition();

  function sendTestEmail() {
    startTest(async () => {
      const result = await sendTestEmailAction({ email: testEmail });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Test email sent");
    });
  }

  function saveConfiguration() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveSmtpConfigAction({
        mailerType: form.mailerType,
        host: form.host,
        port: form.port,
        username: form.username,
        encryption: form.encryption,
        fromAddress: form.fromAddress,
        fromName: form.fromName,
      });
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess("SMTP configuration saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          SMTP Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Outbound email settings. Used by Admin → Contacts replies and the
          test email below.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <SetupCard
          title="SMTP Settings"
          onSave={saveConfiguration}
          saveLabel={pending ? "Saving…" : "Save Configuration"}
        >
          {formError ? (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}
          <FieldRow label="Type">
            <Select
              className={controlClass}
              value={form.mailerType}
              onChange={(e) => {
                const next = SMTP_MAILER_TYPES.find(
                  (m) => m.value === e.target.value,
                );
                if (next) {
                  setForm({ ...form, mailerType: next.value });
                }
              }}
            >
              {SMTP_MAILER_TYPES.map((mailer) => (
                <option key={mailer.value} value={mailer.value}>
                  {mailer.label}
                </option>
              ))}
            </Select>
          </FieldRow>
          <FieldRow label="Host">
            <Input
              className={controlClass}
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="smtp.example.com"
              autoComplete="off"
            />
          </FieldRow>
          <FieldRow label="Port">
            <Input
              type="number"
              min={1}
              max={65535}
              className={controlClass}
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
            />
          </FieldRow>
          <FieldRow label="Username">
            <Input
              className={controlClass}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="off"
            />
          </FieldRow>
          <FieldRow label="Encryption">
            <Select
              className={controlClass}
              value={form.encryption}
              onChange={(e) => {
                const next = SMTP_ENCRYPTION_OPTIONS.find(
                  (opt) => opt.value === e.target.value,
                );
                if (next) {
                  setForm({ ...form, encryption: next.value });
                }
              }}
            >
              {SMTP_ENCRYPTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FieldRow>
          <FieldRow label="From address">
            <Input
              type="email"
              className={controlClass}
              value={form.fromAddress}
              onChange={(e) =>
                setForm({ ...form, fromAddress: e.target.value })
              }
              placeholder="noreply@example.com"
            />
          </FieldRow>
          <FieldRow label="From name">
            <Input
              className={controlClass}
              value={form.fromName}
              onChange={(e) => setForm({ ...form, fromName: e.target.value })}
              placeholder="Techno House"
            />
          </FieldRow>
        </SetupCard>

        <div className="space-y-4">
          <SetupCard
            title="Test SMTP"
            onSave={sendTestEmail}
            saveLabel={testPending ? "Sending…" : "Send test email"}
          >
            <FieldRow label="Email address">
              <Input
                type="email"
                className={controlClass}
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={testPending}
              />
            </FieldRow>
          </SetupCard>

          <InstructionCard title="SSL / TLS notes">
            <p>Use port 587 with TLS for most providers.</p>
            <p>
              Use port 465 with SSL when your provider requires implicit SSL.
            </p>
            <p>
              SMTP password stays in environment variables (see `.env.example`).
              It is never saved to the database. Set SMTP_PASSWORD and choose
              the SMTP mailer type above to send real email.
            </p>
          </InstructionCard>
        </div>
      </div>
    </div>
  );
}

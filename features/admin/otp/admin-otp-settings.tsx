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
import { AdminToggleRow } from "@/features/admin/products/admin-toggle-switch";
import { notifyError } from "@/components/ui/feedback-provider";
import {
  saveOtpSmsConfigAction,
  sendTestOtpAction,
} from "@/features/admin/otp/otp-actions";
import {
  OTP_PROVIDERS,
  type AdminOtpConfig,
  type OtpProviderId,
} from "@/lib/otp/fields";

export function AdminOtpSettings({
  config,
  otpExemptCustomers,
}: {
  config: AdminOtpConfig;
  /** Active customers with no phone number, who sign in without an OTP. */
  otpExemptCustomers: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    provider: OtpProviderId;
    senderId: string;
    otpLength: string;
    expiryMinutes: string;
    otpLogin: boolean;
    otpRegistration: boolean;
  }>({
    provider: config.provider,
    senderId: config.senderId,
    otpLength: String(config.otpLength),
    expiryMinutes: String(config.expiryMinutes),
    otpLogin: config.otpLogin,
    otpRegistration: config.otpRegistration,
  });
  const [testPhone, setTestPhone] = useState("");
  const [testPending, startTest] = useTransition();

  function sendTestSms() {
    startTest(async () => {
      const result = await sendTestOtpAction({ phone: testPhone });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Test SMS sent");
    });
  }

  function saveConfiguration() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveOtpSmsConfigAction({
        provider: form.provider,
        senderId: form.senderId,
        otpLength: form.otpLength,
        expiryMinutes: form.expiryMinutes,
        otpLogin: form.otpLogin,
        otpRegistration: form.otpRegistration,
      });
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess("OTP / SMS gateway saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          OTP / SMS Gateway
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure the SMS gateway and send test messages. When enabled, OTP
          runs as a second factor: after a correct password, the customer must
          also enter a code texted to their phone before the session (or, for
          registration, the account itself) is created. Accounts with no phone
          number on file skip this step. Requires a real SMS provider above —
          Local mock will not deliver codes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <SetupCard
          title="OTP / SMS Gateway"
          onSave={saveConfiguration}
          saveLabel={pending ? "Saving…" : "Save Configuration"}
        >
          {formError ? (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}
          <FieldRow label="Provider">
            <Select
              className={controlClass}
              value={form.provider}
              onChange={(e) => {
                const next = OTP_PROVIDERS.find(
                  (p) => p.value === e.target.value,
                );
                if (next) {
                  setForm({ ...form, provider: next.value });
                }
              }}
            >
              {OTP_PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </Select>
          </FieldRow>
          <FieldRow label="Sender ID">
            <Input
              className={controlClass}
              value={form.senderId}
              onChange={(e) => setForm({ ...form, senderId: e.target.value })}
              placeholder="TechnoHouse"
              autoComplete="off"
            />
          </FieldRow>
          <FieldRow label="OTP length">
            <Select
              className={controlClass}
              value={form.otpLength}
              onChange={(e) => setForm({ ...form, otpLength: e.target.value })}
            >
              <option value="4">4 digits</option>
              <option value="6">6 digits</option>
            </Select>
          </FieldRow>
          <FieldRow label="OTP expiry (minutes)">
            <Input
              type="number"
              min={1}
              max={30}
              className={controlClass}
              value={form.expiryMinutes}
              onChange={(e) =>
                setForm({ ...form, expiryMinutes: e.target.value })
              }
            />
          </FieldRow>
          <AdminToggleRow
            label="Enable OTP for login"
            checked={form.otpLogin}
            onChange={(checked) => setForm({ ...form, otpLogin: checked })}
          />
          {/*
            The policy is not universal, and silently was not (P0-04): sign-in
            can only send a code to an account that has a phone number, so
            accounts without one continue to authenticate on a password alone.
            Saying so here is the difference between a known limit and a
            surprise.
          */}
          {form.otpLogin && otpExemptCustomers > 0 ? (
            <p className="px-1 text-sm text-amber-700">
              <strong>{otpExemptCustomers}</strong>{" "}
              {otpExemptCustomers === 1
                ? "active customer has"
                : "active customers have"}{" "}
              no phone number on file and will keep signing in with a password
              only — there is nowhere to send them a code. Collect a phone
              number from those accounts to cover them.
            </p>
          ) : null}
          <AdminToggleRow
            label="Enable OTP for registration"
            checked={form.otpRegistration}
            onChange={(checked) =>
              setForm({ ...form, otpRegistration: checked })
            }
          />
        </SetupCard>

        <div className="space-y-4">
          <SetupCard
            title="Test SMS"
            onSave={sendTestSms}
            saveLabel={testPending ? "Sending…" : "Send test OTP"}
          >
            <FieldRow label="Phone number">
              <Input
                type="tel"
                className={controlClass}
                placeholder="+880 1XXX-XXXXXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={testPending}
              />
            </FieldRow>
          </SetupCard>

          <InstructionCard title="OTP / SMS notes">
            <p>
              This gateway is not just for OTP codes — it also sends the order
              confirmation SMS (in Bangla) that goes out when a customer
              places an order and again when staff confirm it, alongside the
              matching confirmation email.
            </p>
            <p>
              SSL Wireless, Mim SMS, and BulkSMSBD are common BD-friendly
              gateways for local delivery. Twilio and MessageBird also work
              for test sends.
            </p>
            <p>
              &quot;Send test OTP&quot; sends a real SMS through the selected
              provider once SMS_API_KEY / SMS_API_SECRET are set. Local mock
              never sends. Login and registration OTP endpoints
              (generate/verify) are not built yet — those flags only store
              intent.
            </p>
            <p>
              API keys and secrets stay in environment variables (see
              `.env.example`). They are never saved to the database.
            </p>
          </InstructionCard>
        </div>
      </div>
    </div>
  );
}

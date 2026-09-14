"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import {
  saveBkashGatewayAction,
  saveNagadGatewayAction,
  saveSslcommerzGatewayAction,
} from "@/features/admin/payments/payment-gateway-actions";
import type { AdminGatewayFormView } from "@/lib/payments/gateway-settings";
import { cn } from "@/lib/cn";

const controlClass =
  "h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:gap-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function GatewayCard({
  name,
  logo,
  logoClass,
  enabled,
  onEnabledChange,
  children,
  onSave,
  saving,
}: {
  name: string;
  logo: string;
  logoClass: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  children: ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex h-8 min-w-[4.5rem] items-center justify-center rounded px-2 text-xs font-bold tracking-wide text-white",
              logoClass,
            )}
          >
            {logo}
          </span>
          <h2 className="text-base font-semibold text-neutral-900">{name}</h2>
        </div>
        <AdminToggleSwitch
          label={`Enable ${name}`}
          checked={enabled}
          onChange={onEnabledChange}
        />
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
      <div className="flex justify-end px-5 pb-5">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rounded-md bg-[#3897f0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2f86d8] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}

function BkashCard({ initial }: { initial: AdminGatewayFormView }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [sandbox, setSandbox] = useState(initial.sandbox);
  const [appKey, setAppKey] = useState(initial.fields.appKey ?? "");
  const [appSecret, setAppSecret] = useState("");
  const [username, setUsername] = useState(initial.fields.username ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <GatewayCard
      name="bKash"
      logo="bKash"
      logoClass="bg-[#E2136E]"
      enabled={enabled}
      onEnabledChange={setEnabled}
      saving={saving}
      onSave={() => {
        setSaving(true);
        void (async () => {
          const result = await saveBkashGatewayAction({
            enabled,
            sandbox,
            appKey,
            appSecret,
            username,
            password,
          });
          setSaving(false);
          if (!result.ok) {
            notifyError(result.formError);
            return;
          }
          notifySuccess("bKash settings saved");
          setAppSecret("");
          setPassword("");
        })();
      }}
    >
      <FieldRow label="Checkout App Key">
        <Input
          value={appKey}
          onChange={(e) => setAppKey(e.target.value)}
          placeholder="App key"
          className={controlClass}
          autoComplete="off"
        />
      </FieldRow>
      <FieldRow label="Checkout App Secret">
        <Input
          type="password"
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
          placeholder={
            initial.hasSecrets ? "Leave blank to keep current secret" : "App secret"
          }
          className={controlClass}
          autoComplete="new-password"
        />
      </FieldRow>
      <FieldRow label="Username">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className={controlClass}
          autoComplete="off"
        />
      </FieldRow>
      <FieldRow label="Password">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={
            initial.hasSecrets ? "Leave blank to keep current password" : "Password"
          }
          className={controlClass}
          autoComplete="new-password"
        />
      </FieldRow>
      <div className="flex items-center gap-3 pt-1">
        <AdminToggleSwitch
          label="Sandbox mode"
          checked={sandbox}
          onChange={setSandbox}
          activeClassName="bg-emerald-500"
        />
        <span className="text-sm text-neutral-700">Sandbox mode</span>
      </div>
    </GatewayCard>
  );
}

function NagadCard({ initial }: { initial: AdminGatewayFormView }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [mode, setMode] = useState(initial.fields.mode ?? "");
  const [merchantId, setMerchantId] = useState(initial.fields.merchantId ?? "");
  const [merchantNumber, setMerchantNumber] = useState(
    initial.fields.merchantNumber ?? "",
  );
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <GatewayCard
      name="Nagad"
      logo="Nagad"
      logoClass="bg-[#F47920]"
      enabled={enabled}
      onEnabledChange={setEnabled}
      saving={saving}
      onSave={() => {
        setSaving(true);
        void (async () => {
          const result = await saveNagadGatewayAction({
            enabled,
            mode,
            merchantId,
            merchantNumber,
            publicKey,
            privateKey,
          });
          setSaving(false);
          if (!result.ok) {
            notifyError(result.formError);
            return;
          }
          notifySuccess("Nagad settings saved (checkout wiring later)");
          setPublicKey("");
          setPrivateKey("");
        })();
      }}
    >
      <FieldRow label="Mode">
        <Input
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          placeholder="sandbox / live"
          className={controlClass}
          autoComplete="off"
        />
      </FieldRow>
      <FieldRow label="Merchant Id">
        <Input
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
          placeholder="Merchant id"
          className={controlClass}
          autoComplete="off"
        />
      </FieldRow>
      <FieldRow label="Merchant Number">
        <Input
          value={merchantNumber}
          onChange={(e) => setMerchantNumber(e.target.value)}
          placeholder="Merchant number"
          className={controlClass}
          autoComplete="off"
        />
      </FieldRow>
      <FieldRow label="PG Public Key">
        <Input
          type="password"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder={
            initial.hasSecrets ? "Leave blank to keep current key" : "Public key"
          }
          className={controlClass}
          autoComplete="new-password"
        />
      </FieldRow>
      <FieldRow label="Merchant Private Key">
        <Input
          type="password"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder={
            initial.hasSecrets
              ? "Leave blank to keep current key"
              : "Private key"
          }
          className={controlClass}
          autoComplete="new-password"
        />
      </FieldRow>
    </GatewayCard>
  );
}

function SslcommerzCard({ initial }: { initial: AdminGatewayFormView }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [sandbox, setSandbox] = useState(initial.sandbox);
  const [storeId, setStoreId] = useState(initial.fields.storeId ?? "");
  const [storePassword, setStorePassword] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <GatewayCard
      name="SSLCommerz"
      logo="sslcommerz"
      logoClass="bg-[#1B4F9C] text-[10px]"
      enabled={enabled}
      onEnabledChange={setEnabled}
      saving={saving}
      onSave={() => {
        setSaving(true);
        void (async () => {
          const result = await saveSslcommerzGatewayAction({
            enabled,
            sandbox,
            storeId,
            storePassword,
          });
          setSaving(false);
          if (!result.ok) {
            notifyError(result.formError);
            return;
          }
          notifySuccess("SSLCommerz settings saved");
          setStorePassword("");
        })();
      }}
    >
      <FieldRow label="Store Id">
        <Input
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          placeholder="Store id"
          className={controlClass}
          autoComplete="off"
        />
      </FieldRow>
      <FieldRow label="Store password">
        <Input
          type="password"
          value={storePassword}
          onChange={(e) => setStorePassword(e.target.value)}
          placeholder={
            initial.hasSecrets
              ? "Leave blank to keep current password"
              : "Store password"
          }
          className={controlClass}
          autoComplete="new-password"
        />
      </FieldRow>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:gap-4">
        <span className="text-sm text-neutral-700">Sandbox mode</span>
        <div>
          <AdminToggleSwitch
            label="Sandbox mode"
            checked={sandbox}
            onChange={setSandbox}
            activeClassName="bg-emerald-500"
          />
        </div>
      </div>
    </GatewayCard>
  );
}

export function AdminPaymentMethods({
  initial,
}: {
  initial: {
    sslcommerz: AdminGatewayFormView;
    bkash: AdminGatewayFormView;
    nagad: AdminGatewayFormView;
  };
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Payment Methods
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enable gateways and save merchant credentials. Secrets are encrypted
          in the database. Sandbox mode is for testing — customers never see
          that label at checkout.
        </p>
        {!initial.sslcommerz.secretsKeyReady ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Set <code className="font-mono">GATEWAY_SECRETS_KEY</code> in{" "}
            <code className="font-mono">.env.local</code> (min 16 characters),
            then restart the server before saving secrets.
          </p>
        ) : null}
      </div>

      <BkashCard initial={initial.bkash} />
      <NagadCard initial={initial.nagad} />
      <SslcommerzCard initial={initial.sslcommerz} />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { saveShippingMethodAction } from "@/features/admin/shipping/shipping-actions";
import {
  saveSteadfastCourierAction,
  savePathaoCourierAction,
} from "@/features/admin/shipping/courier-actions";
import {
  AdminToggleSwitch,
  FieldRow,
  Input,
  SetupCard,
  controlClass,
} from "@/features/admin/settings/setup-ui";
import type { AdminShippingMethod } from "@/lib/shipping/types";
import type { AdminCourierFormView } from "@/lib/shipping/courier-settings";

function SteadfastCard({ initial }: { initial: AdminCourierFormView }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [apiKey, setApiKey] = useState(initial.fields.apiKey ?? "");
  const [secretKey, setSecretKey] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveSteadfastCourierAction({
        enabled,
        apiKey,
        secretKey,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setSecretKey("");
      notifySuccess("Steadfast settings saved");
      router.refresh();
    });
  }

  return (
    <SetupCard
      title="Steadfast"
      onSave={save}
      saveLabel={pending ? "Saving…" : "Save"}
    >
      <FieldRow label="Enable">
        <AdminToggleSwitch
          label="Enable Steadfast"
          checked={enabled}
          onChange={setEnabled}
          activeClassName="bg-emerald-500"
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="API Key">
        <Input
          className={controlClass}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="Secret Key">
        <Input
          type="password"
          className={controlClass}
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          autoComplete="new-password"
          placeholder={
            initial.hasSecrets ? "Leave blank to keep current secret" : undefined
          }
          disabled={pending}
        />
      </FieldRow>
    </SetupCard>
  );
}

function PathaoCard({ initial }: { initial: AdminCourierFormView }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [mode, setMode] = useState(initial.fields.mode ?? "sandbox");
  const [storeId, setStoreId] = useState(initial.fields.storeId ?? "");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await savePathaoCourierAction({
        enabled,
        mode,
        storeId,
        clientId,
        clientSecret,
        username,
        password,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setClientId("");
      setClientSecret("");
      setUsername("");
      setPassword("");
      notifySuccess("Pathao settings saved");
      router.refresh();
    });
  }

  return (
    <SetupCard
      title="Pathao"
      onSave={save}
      saveLabel={pending ? "Saving…" : "Save"}
    >
      <FieldRow label="Enable">
        <AdminToggleSwitch
          label="Enable Pathao"
          checked={enabled}
          onChange={setEnabled}
          activeClassName="bg-emerald-500"
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="Mode" hint="sandbox or live">
        <Input
          className={controlClass}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="Store ID">
        <Input
          className={controlClass}
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="Client ID">
        <Input
          className={controlClass}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          autoComplete="off"
          placeholder={initial.hasSecrets ? "Leave blank to keep current" : undefined}
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="Client Secret">
        <Input
          type="password"
          className={controlClass}
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          autoComplete="new-password"
          placeholder={initial.hasSecrets ? "Leave blank to keep current" : undefined}
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="Merchant username" hint="Pathao account phone/email">
        <Input
          className={controlClass}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          placeholder={initial.hasSecrets ? "Leave blank to keep current" : undefined}
          disabled={pending}
        />
      </FieldRow>
      <FieldRow label="Password">
        <Input
          type="password"
          className={controlClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={initial.hasSecrets ? "Leave blank to keep current" : undefined}
          disabled={pending}
        />
      </FieldRow>
    </SetupCard>
  );
}

function MethodCard({ method }: { method: AdminShippingMethod }) {
  const router = useRouter();
  const [name, setName] = useState(method.name);
  const [description, setDescription] = useState(method.description);
  const [baseRate, setBaseRate] = useState(String(method.baseRate));
  const [isPickup, setIsPickup] = useState(method.isPickup);
  const [isActive, setIsActive] = useState(method.isActive);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <SetupCard
      title={method.code}
      saveLabel={pending ? "Saving…" : "Save"}
      onSave={() => {
        setFormError(null);
        startTransition(async () => {
          const result = await saveShippingMethodAction({
            id: method.id,
            name,
            description,
            baseRate,
            isPickup,
            isActive,
          });
          if (!result.ok) {
            setFormError(result.formError);
            notifyError(result.formError);
            return;
          }
          notifySuccess("Shipping method saved");
          router.refresh();
        });
      }}
    >
      {formError ? (
        <Alert tone="danger" title="Could not save">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}
      <FieldRow label="Enable">
        <AdminToggleSwitch
          label={`Enable ${method.name}`}
          checked={isActive}
          onChange={setIsActive}
          activeClassName="bg-emerald-500"
        />
      </FieldRow>
      <FieldRow label="Display name">
        <Input
          className={controlClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FieldRow>
      <FieldRow label="Description">
        <Input
          className={controlClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FieldRow>
      <FieldRow label="Rate (৳)">
        <Input
          className={controlClass}
          inputMode="numeric"
          value={baseRate}
          onChange={(e) => setBaseRate(e.target.value)}
        />
      </FieldRow>
      <FieldRow label="Store pickup">
        <AdminToggleSwitch
          label={`Pickup ${method.name}`}
          checked={isPickup}
          onChange={setIsPickup}
          activeClassName="bg-emerald-500"
        />
      </FieldRow>
      {method.zoneCodes.length > 0 ? (
        <p className="text-xs text-neutral-500">
          Zones: {method.zoneCodes.join(", ")} (edit in Zones/areas)
        </p>
      ) : null}
    </SetupCard>
  );
}

export function AdminShippingMethods({
  methods,
  couriers,
}: {
  methods: AdminShippingMethod[];
  couriers: { pathao: AdminCourierFormView; steadfast: AdminCourierFormView };
}) {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Select Shipping Method
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Persist delivery options and rates. Enabling Pathao or Steadfast
          here adds a real &quot;Send to…&quot; button on Admin → Orders that
          books the parcel directly with that courier.
        </p>
        {!couriers.pathao.secretsKeyReady ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Set <code className="font-mono">COURIER_SECRETS_KEY</code> in{" "}
            <code className="font-mono">.env.local</code> (min 16 characters),
            then restart the server before saving courier credentials.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {methods.map((method) => (
          <MethodCard key={method.id} method={method} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PathaoCard initial={couriers.pathao} />
        <SteadfastCard initial={couriers.steadfast} />
      </div>
    </div>
  );
}

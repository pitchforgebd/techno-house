"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AdminToggleSwitch,
  FieldRow,
  Input,
  Select,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import {
  saveBackblazeSettingsAction,
  saveCacheSettingsAction,
  saveLocalStorageAction,
  saveS3SettingsAction,
} from "@/features/admin/settings/filesystem-actions";
import type { AdminFilesystemSettings } from "@/lib/storage/filesystem-config";

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <FieldRow label={label}>
      <Input
        type="password"
        className={controlClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        placeholder={placeholder}
        disabled={disabled}
      />
    </FieldRow>
  );
}

export function AdminFilesystemSettings({
  initial,
}: {
  initial: AdminFilesystemSettings;
}) {
  const router = useRouter();

  const [localActive, setLocalActive] = useState(initial.localActive);
  const [localPending, startLocal] = useTransition();

  const [s3Active, setS3Active] = useState(initial.s3Active);
  const [s3, setS3] = useState({
    key: initial.s3Key,
    secret: "",
    region: initial.s3Region,
    bucket: initial.s3Bucket,
  });
  const [s3Pending, startS3] = useTransition();

  const [backblazeActive, setBackblazeActive] = useState(
    initial.backblazeActive,
  );
  const [backblaze, setBackblaze] = useState({
    keyId: initial.backblazeKeyId,
    applicationKey: "",
    bucket: initial.backblazeBucket,
    region: initial.backblazeRegion,
  });
  const [backblazePending, startBackblaze] = useTransition();

  const [cacheDriver, setCacheDriver] = useState(initial.cacheDriver);
  const [sessionDriver, setSessionDriver] = useState(initial.sessionDriver);
  const [redis, setRedis] = useState({
    host: initial.redisHost,
    port: initial.redisPort,
    password: "",
  });
  const [cachePending, startCache] = useTransition();

  function saveLocal() {
    startLocal(async () => {
      const result = await saveLocalStorageAction({ localActive });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Local storage settings saved");
      router.refresh();
    });
  }

  function saveS3() {
    startS3(async () => {
      const result = await saveS3SettingsAction({
        s3Active,
        s3Key: s3.key,
        s3Secret: s3.secret,
        s3Region: s3.region,
        s3Bucket: s3.bucket,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setS3((current) => ({ ...current, secret: "" }));
      notifySuccess("S3 settings saved");
      router.refresh();
    });
  }

  function saveBackblaze() {
    startBackblaze(async () => {
      const result = await saveBackblazeSettingsAction({
        backblazeActive,
        backblazeKeyId: backblaze.keyId,
        backblazeApplicationKey: backblaze.applicationKey,
        backblazeBucket: backblaze.bucket,
        backblazeRegion: backblaze.region,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setBackblaze((current) => ({ ...current, applicationKey: "" }));
      notifySuccess("Backblaze settings saved");
      router.refresh();
    });
  }

  function saveCache() {
    startCache(async () => {
      const result = await saveCacheSettingsAction({
        cacheDriver,
        sessionDriver,
        redisHost: redis.host,
        redisPort: redis.port,
        redisPassword: redis.password,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setRedis((current) => ({ ...current, password: "" }));
      notifySuccess("Cache & session settings saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          File System & Cache Configuration
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Storage drivers, cache and session configuration. The upload
          system now reads these settings: local disk works today; activating
          S3 or Backblaze blocks uploads with a clear message instead of
          silently using local disk, since neither has a real client
          integration yet. Redis cache/session drivers are saved here but not
          yet wired to a live backend.
        </p>
        {!initial.secretsKeyReady ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Set <code className="font-mono">STORAGE_SECRETS_KEY</code> in{" "}
            <code className="font-mono">.env.local</code> (min 16 characters),
            then restart the server before saving secrets.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SetupCard
          title="Local Storage"
          onSave={saveLocal}
          saveLabel={localPending ? "Saving…" : "Save"}
        >
          <FieldRow label="Activation">
            <AdminToggleSwitch
              label="Local storage activation"
              checked={localActive}
              onChange={setLocalActive}
              activeClassName="bg-emerald-500"
              disabled={localPending}
            />
          </FieldRow>
          <p className="text-sm text-neutral-500">
            Store uploads on the application server filesystem.
          </p>
        </SetupCard>

        <SetupCard
          title="Amazon S3"
          onSave={saveS3}
          saveLabel={s3Pending ? "Saving…" : "Save"}
        >
          <FieldRow label="Activation">
            <AdminToggleSwitch
              label="S3 activation"
              checked={s3Active}
              onChange={setS3Active}
              activeClassName="bg-emerald-500"
              disabled={s3Pending}
            />
          </FieldRow>
          <FieldRow label="Access key">
            <Input
              className={controlClass}
              value={s3.key}
              onChange={(e) => setS3({ ...s3, key: e.target.value })}
              disabled={s3Pending}
            />
          </FieldRow>
          <SecretField
            label="Secret key"
            value={s3.secret}
            onChange={(secret) => setS3({ ...s3, secret })}
            placeholder={initial.s3HasSecret ? "Leave blank to keep current secret" : undefined}
            disabled={s3Pending}
          />
          <FieldRow label="Region">
            <Input
              className={controlClass}
              value={s3.region}
              onChange={(e) => setS3({ ...s3, region: e.target.value })}
              disabled={s3Pending}
            />
          </FieldRow>
          <FieldRow label="Bucket">
            <Input
              className={controlClass}
              value={s3.bucket}
              onChange={(e) => setS3({ ...s3, bucket: e.target.value })}
              disabled={s3Pending}
            />
          </FieldRow>
          {s3Active ? (
            <p className="text-sm font-medium text-amber-600">
              S3 upload/read/delete isn&apos;t implemented yet — activating
              this blocks uploads with a clear error instead of silently
              writing to local disk under the S3 label.
            </p>
          ) : null}
        </SetupCard>

        <SetupCard
          title="Backblaze B2"
          onSave={saveBackblaze}
          saveLabel={backblazePending ? "Saving…" : "Save"}
        >
          <FieldRow label="Activation">
            <AdminToggleSwitch
              label="Backblaze activation"
              checked={backblazeActive}
              onChange={setBackblazeActive}
              activeClassName="bg-emerald-500"
              disabled={backblazePending}
            />
          </FieldRow>
          <FieldRow label="Key ID">
            <Input
              className={controlClass}
              value={backblaze.keyId}
              onChange={(e) =>
                setBackblaze({ ...backblaze, keyId: e.target.value })
              }
              disabled={backblazePending}
            />
          </FieldRow>
          <SecretField
            label="Application key"
            value={backblaze.applicationKey}
            onChange={(applicationKey) =>
              setBackblaze({ ...backblaze, applicationKey })
            }
            placeholder={
              initial.backblazeHasKey
                ? "Leave blank to keep current key"
                : undefined
            }
            disabled={backblazePending}
          />
          <FieldRow label="Bucket">
            <Input
              className={controlClass}
              value={backblaze.bucket}
              onChange={(e) =>
                setBackblaze({ ...backblaze, bucket: e.target.value })
              }
              disabled={backblazePending}
            />
          </FieldRow>
          <FieldRow label="Region">
            <Input
              className={controlClass}
              value={backblaze.region}
              onChange={(e) =>
                setBackblaze({ ...backblaze, region: e.target.value })
              }
              disabled={backblazePending}
            />
          </FieldRow>
          {backblazeActive ? (
            <p className="text-sm font-medium text-amber-600">
              Backblaze upload/read/delete isn&apos;t implemented yet —
              activating this blocks uploads with a clear error instead of
              silently writing to local disk under the Backblaze label.
            </p>
          ) : null}
        </SetupCard>

        <SetupCard
          title="Cache & Session"
          onSave={saveCache}
          saveLabel={cachePending ? "Saving…" : "Save drivers"}
        >
          <FieldRow label="Cache driver">
            <Select
              className={controlClass}
              value={cacheDriver}
              onChange={(e) => setCacheDriver(e.target.value)}
              disabled={cachePending}
            >
              <option value="file">File</option>
              <option value="redis">Redis</option>
            </Select>
          </FieldRow>
          <FieldRow label="Session driver">
            <Select
              className={controlClass}
              value={sessionDriver}
              onChange={(e) => setSessionDriver(e.target.value)}
              disabled={cachePending}
            >
              <option value="file">File</option>
              <option value="redis">Redis</option>
            </Select>
          </FieldRow>
          <FieldRow label="Redis host">
            <Input
              className={controlClass}
              value={redis.host}
              onChange={(e) => setRedis({ ...redis, host: e.target.value })}
              disabled={cachePending}
            />
          </FieldRow>
          <FieldRow label="Redis port">
            <Input
              className={controlClass}
              value={redis.port}
              onChange={(e) => setRedis({ ...redis, port: e.target.value })}
              disabled={cachePending}
            />
          </FieldRow>
          <SecretField
            label="Redis password"
            value={redis.password}
            onChange={(password) => setRedis({ ...redis, password })}
            placeholder={
              initial.redisHasPassword
                ? "Leave blank to keep current password"
                : undefined
            }
            disabled={cachePending}
          />
        </SetupCard>
      </div>
    </div>
  );
}

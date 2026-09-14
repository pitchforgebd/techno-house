"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  saveFacebookCatalogIdAction,
  saveGa4ConfigAction,
  saveGtmConfigAction,
  saveMerchantCenterConfigAction,
  saveMetaPixelConfigAction,
} from "@/features/admin/analytics/analytics-actions";
import { saveCustomScriptsAction } from "@/features/admin/analytics/custom-script-actions";
import {
  refreshSitemapAction,
  saveGlobalSeoAction,
  saveHomeSeoContentAction,
} from "@/features/admin/analytics/seo-actions";
import { RichTextEditor } from "@/features/admin/marketing/rich-text-editor";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import type {
  AdminAnalyticsConfig,
  AdminMerchantConfig,
  AdminMetaConfig,
} from "@/lib/analytics/ids";

/** Mirrors CUSTOM_SCRIPT_MAX in lib/analytics/custom-scripts.ts (server-only, not importable from a client component). */
const CUSTOM_SCRIPT_MAX = 20000;
import type { AdminSeoConfig } from "@/lib/seo/fields";
import { ROBOTS_PATH, SITEMAP_PATH } from "@/lib/seo/fields";
import { cn } from "@/lib/cn";

const controlClass =
  "h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const scriptPlaceholder = `<script>
...
</script>`;

function AnalyticsCrumb({ current }: { current: string }) {
  return (
    <p className="text-caption font-medium text-primary">
      <Link href="/admin/analytics" className="hover:underline">
        Marketing Analytics
      </Link>
      <span className="text-text-muted"> / {current}</span>
    </p>
  );
}

function InstructionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="mt-4 space-y-0">{children}</div>
    </aside>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="border-b border-neutral-100 py-3 text-sm leading-relaxed text-neutral-700 last:border-b-0">
      <span className="font-semibold text-neutral-900">{n}. </span>
      {children}
    </div>
  );
}

function NoteBox({
  tone,
  children,
}: {
  tone: "blue" | "yellow" | "green";
  children: ReactNode;
}) {
  const styles = {
    blue: "border-sky-100 bg-sky-50 text-sky-900",
    yellow: "border-amber-100 bg-amber-50 text-amber-950",
    green: "border-emerald-100 bg-emerald-50 text-emerald-900",
  };
  return (
    <div
      className={cn("mt-4 rounded-md border px-3 py-3 text-sm", styles[tone])}
    >
      {children}
    </div>
  );
}

function GreenUpdateButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-w-[7rem] bg-emerald-500 px-6 hover:bg-emerald-600"
    >
      {disabled ? "Saving…" : "Update"}
    </Button>
  );
}

function BlueSaveButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-w-[6rem] bg-[#3897f0] hover:bg-[#2f86d8]"
    >
      {disabled ? "Saving…" : "Save"}
    </Button>
  );
}

/** Shared two-column: form left + instructions right */
export function AdminGa4SettingsPage({
  config,
}: {
  config: AdminAnalyticsConfig;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [trackingId, setTrackingId] = useState(config.publicId);
  const [propertyId, setPropertyId] = useState(config.propertyId);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 pb-10">
      <AnalyticsCrumb current="Google Analytics (GA4)" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">
            Google Analytics Setting
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Stores the public measurement ID only. Service-account keys stay out
            of the database.
          </p>
          {formError ? (
            <Alert tone="danger" title="Could not save" className="mt-4">
              <p className="text-caption">{formError}</p>
            </Alert>
          ) : null}
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-neutral-800">
                Google Analytics
              </span>
              <AdminToggleSwitch
                label="Enable Google Analytics"
                checked={enabled}
                onChange={setEnabled}
              />
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-neutral-700">
                Tracking ID
              </span>
              <Input
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="G-XXXXXXXXX"
                className={controlClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-neutral-700">
                Analytics Property ID
              </span>
              <Input
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                placeholder="123456789"
                className={controlClass}
              />
            </label>
            <div className="flex justify-end pt-2">
              <BlueSaveButton
                disabled={pending}
                onClick={() => {
                  setFormError(null);
                  startTransition(async () => {
                    const result = await saveGa4ConfigAction({
                      isEnabled: enabled,
                      publicId: trackingId,
                      propertyId,
                    });
                    if (!result.ok) {
                      setFormError(result.formError);
                      notifyError(result.formError);
                      return;
                    }
                    notifySuccess("GA4 settings saved");
                    router.refresh();
                  });
                }}
              />
            </div>
          </div>
        </section>

        <InstructionCard title="Google Analytics Setup Instructions">
          <Step n={1}>
            Open{" "}
            <span className="font-semibold text-[#3897f0]">
              Google Cloud Console
            </span>{" "}
            and select your project.
          </Step>
          <Step n={2}>
            Enable the <strong>Google Analytics Data API</strong>.
          </Step>
          <Step n={3}>Create a Service Account for Techno House.</Step>
          <Step n={4}>Download the JSON key for that service account.</Step>
          <Step n={5}>
            Rename the file to{" "}
            <code className="text-red-600">
              service-account-credentials.json
            </code>
            .
          </Step>
          <Step n={6}>
            Place it under{" "}
            <code className="text-red-600">
              storage/app/analytics/service-account-credentials.json
            </code>{" "}
            (mock path until backend).
          </Step>
          <Step n={7}>
            Add env:{" "}
            <code className="break-all text-red-600">
              ANALYTICS_SERVICE_ACCOUNT_CREDENTIALS_JSON=storage/app/analytics/service-account-credentials.json
            </code>
          </Step>
          <Step n={8}>
            Copy Property ID from GA4 Admin → Property settings.
          </Step>
          <Step n={9}>
            Grant the service account email <strong>Viewer</strong> on the
            property.
          </Step>
          <Step n={10}>
            Paste Tracking ID (G-…) and Property ID, then Save.
          </Step>
          <NoteBox tone="blue">
            <strong>Note</strong> The file name must be exactly{" "}
            <strong>service-account-credentials.json</strong> and must be placed
            inside <code>storage/app/analytics/</code>.
          </NoteBox>
        </InstructionCard>
      </div>
    </div>
  );
}

export function AdminGtmSettingsPage({
  config,
}: {
  config: AdminAnalyticsConfig;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [containerId, setContainerId] = useState(config.publicId);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 pb-10">
      <AnalyticsCrumb current="Google Tag Manager" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">
            Google Tag Manager
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Stores the public container ID. Official snippets are injected on
            the storefront. Raw scripts are not saved.
          </p>
          {formError ? (
            <Alert tone="danger" title="Could not save" className="mt-4">
              <p className="text-caption">{formError}</p>
            </Alert>
          ) : null}
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-neutral-800">
                Google Tag Manager
              </span>
              <AdminToggleSwitch
                label="Enable Google Tag Manager"
                checked={enabled}
                onChange={setEnabled}
              />
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-neutral-700">
                Container ID
              </span>
              <Input
                value={containerId}
                onChange={(e) => setContainerId(e.target.value)}
                placeholder="GTM-XXXXXXX"
                className={controlClass}
              />
            </label>
            <div className="flex justify-end">
              <GreenUpdateButton
                disabled={pending}
                onClick={() => {
                  setFormError(null);
                  startTransition(async () => {
                    const result = await saveGtmConfigAction({
                      isEnabled: enabled,
                      publicId: containerId,
                    });
                    if (!result.ok) {
                      setFormError(result.formError);
                      notifyError(result.formError);
                      return;
                    }
                    notifySuccess("GTM settings saved");
                    router.refresh();
                  });
                }}
              />
            </div>
          </div>
        </section>

        <InstructionCard title="Google Tag Manager Setup Instructions">
          <Step n={1}>
            Open Google Tag Manager and sign in with your Google account.
          </Step>
          <Step n={2}>
            Create an account (Account Name, Country, Container Name, Target:
            Web).
          </Step>
          <Step n={3}>
            After creating the container, copy the container ID (GTM-XXXXXXX).
          </Step>
          <Step n={4}>Paste the container ID here and enable GTM.</Step>
          <Step n={5}>
            The storefront injects the official GTM snippet from that ID. Do not
            paste raw script tags.
          </Step>
          <NoteBox tone="yellow">
            <strong>Important:</strong> If GTM is enabled, the storefront does
            not also inject GA4 or Meta Pixel, so tags are not double-fired.
            Configure those tags inside GTM when both are needed.
          </NoteBox>
          <NoteBox tone="blue">
            Example GTM ID: <strong>GTM-XXXXXXX</strong>
          </NoteBox>
        </InstructionCard>
      </div>
    </div>
  );
}

export function AdminMetaPixelSettingsPage({
  config,
}: {
  config: AdminMetaConfig;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [pixelId, setPixelId] = useState(config.publicId);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 pb-10">
      <AnalyticsCrumb current="Meta Pixel" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">
            Facebook Pixel Setting
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Stores the public Pixel ID only. Access tokens stay out of the
            database. Enabling this also publishes{" "}
            <code>/feeds/facebook.xml</code>.
          </p>
          {formError ? (
            <Alert tone="danger" title="Could not save" className="mt-4">
              <p className="text-caption">{formError}</p>
            </Alert>
          ) : null}
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Facebook Pixel</span>
              <AdminToggleSwitch
                label="Enable Facebook Pixel"
                checked={enabled}
                onChange={setEnabled}
              />
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-neutral-700">
                Facebook Pixel ID
              </span>
              <Input
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="123456789012345"
                className={controlClass}
              />
            </label>
            <div className="flex justify-end pt-2">
              <BlueSaveButton
                disabled={pending}
                onClick={() => {
                  setFormError(null);
                  startTransition(async () => {
                    const result = await saveMetaPixelConfigAction({
                      isEnabled: enabled,
                      publicId: pixelId,
                    });
                    if (!result.ok) {
                      setFormError(result.formError);
                      notifyError(result.formError);
                      return;
                    }
                    notifySuccess("Meta Pixel settings saved");
                    router.refresh();
                  });
                }}
              />
            </div>
          </div>
        </section>

        <InstructionCard title="Please be careful when you are configuring Facebook pixel.">
          <Step n={1}>
            Log in to Facebook and go to your Ads Manager account.
          </Step>
          <Step n={2}>Open the Navigation Bar and select Events Manager.</Step>
          <Step n={3}>
            Copy your Pixel ID from underneath your Site Name and paste the
            number into the Facebook Pixel ID field.
          </Step>
          <NoteBox tone="yellow">
            If GTM is enabled, this pixel is not also injected on the
            storefront. Add it inside GTM instead.
          </NoteBox>
        </InstructionCard>
      </div>
    </div>
  );
}

export function AdminMetaCapiSettingsPage({
  config,
  live,
}: {
  config: AdminMetaConfig;
  live: boolean;
}) {
  const statusLabel = live
    ? "Live — sending real server-side Purchase events"
    : !config.isEnabled
      ? "Meta Pixel is disabled — no events are sent"
      : "Pixel enabled, but META_CAPI_ACCESS_TOKEN is not set — events fail closed";

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 pb-10">
      <AnalyticsCrumb current="Meta Conversion API" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">
            Facebook Pixel Conversions API Setting
          </h1>
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              live ? "text-emerald-600" : "text-amber-600",
            )}
          >
            {statusLabel}
          </p>
          <div className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Facebook Pixel ID</span>
              <Input
                value={config.publicId}
                readOnly
                placeholder="Set this on Meta Pixel"
                className={controlClass}
              />
            </label>
            <p className="text-sm text-neutral-600">
              Shared from Meta Pixel settings
              {config.isEnabled ? " (pixel enabled)" : " (pixel disabled)"}.
              Change the ID there. The access token belongs in
              META_CAPI_ACCESS_TOKEN on the server, never in this form or the
              database.
            </p>
            <div className="flex justify-end pt-2">
              <Link
                href="/admin/integrations/meta"
                className="text-sm font-medium text-[#3897f0] hover:underline"
              >
                Open Meta Pixel settings
              </Link>
            </div>
          </div>
        </section>

        <InstructionCard title="Facebook Pixel & CAPI Setup Instructions">
          <NoteBox tone="blue">
            Browser PageView uses the official pixel snippet when Meta Pixel is
            enabled. A real server-side Purchase event is sent for every order
            placed once the token below is set.
          </NoteBox>
          <Step n={1}>
            <strong>Create/Get Pixel ID:</strong> Events Manager → select or
            create a pixel → copy the ID.
          </Step>
          <Step n={2}>
            Save that ID on the Meta Pixel page and enable it there.
          </Step>
          <Step n={3}>
            Generate a Conversions API access token in Events Manager → Settings
            → Conversions API, then set it as{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              META_CAPI_ACCESS_TOKEN
            </code>{" "}
            in the server environment and restart the app.
          </Step>
          <NoteBox tone="yellow">
            <ul className="list-disc space-y-1 pl-4">
              <li>The access token stays out of the database — env only.</li>
              <li>
                Purchase events are sent when an order is placed, hashed
                email/phone included for match quality.
              </li>
              <li>Verify your domain in Facebook Business Manager.</li>
            </ul>
          </NoteBox>
        </InstructionCard>
      </div>
    </div>
  );
}

export function AdminFacebookCatalogSettingsPage({
  config,
}: {
  config: AdminMetaConfig;
}) {
  const router = useRouter();
  const [catalogId, setCatalogId] = useState(config.catalogId);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 pb-10">
      <AnalyticsCrumb current="Meta Shop Sync" />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/integrations/facebook-catalog/feed"
          className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
        >
          Catalog products
        </Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">
            Facebook Catalogue Setting
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Stores the public catalog ID only. Graph API tokens are not saved.
            The product feed is{" "}
            <Link href="/feeds/facebook.xml" className="text-[#3897f0]">
              /feeds/facebook.xml
            </Link>{" "}
            when Meta Pixel is enabled.
          </p>
          {formError ? (
            <Alert tone="danger" title="Could not save" className="mt-4">
              <p className="text-caption">{formError}</p>
            </Alert>
          ) : null}
          <div className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Catalog ID</span>
              <Input
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
                placeholder="123456789"
                className={controlClass}
              />
            </label>
            <div className="flex justify-end pt-2">
              <BlueSaveButton
                disabled={pending}
                onClick={() => {
                  setFormError(null);
                  startTransition(async () => {
                    const result = await saveFacebookCatalogIdAction({
                      catalogId,
                    });
                    if (!result.ok) {
                      setFormError(result.formError);
                      notifyError(result.formError);
                      return;
                    }
                    notifySuccess("Facebook catalog ID saved");
                    router.refresh();
                  });
                }}
              />
            </div>
          </div>
        </section>

        <InstructionCard title="Meta (Facebook) Catalog Setup Instructions">
          <Step n={1}>
            Open the{" "}
            <span className="font-semibold text-[#3897f0]">
              Facebook Developers Portal
            </span>
            .
          </Step>
          <Step n={2}>
            Go to <strong>Business</strong> settings and select your business.
          </Step>
          <Step n={3}>Create or open a product catalog for Techno House.</Step>
          <Step n={4}>Copy the Catalog ID from catalog settings.</Step>
          <Step n={5}>
            Point the catalog data source at <code>/feeds/facebook.xml</code>.
            Enable Meta Pixel to publish the feed.
          </Step>
          <NoteBox tone="yellow">
            Access tokens are not stored. Graph upload and product assignment
            stay deferred. Active products appear in the public XML feed.
          </NoteBox>
        </InstructionCard>
      </div>
    </div>
  );
}

export function AdminMerchantCenterSettingsPage({
  config,
}: {
  config: AdminMerchantConfig;
}) {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState(config.publicId);
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 pb-10">
      <AnalyticsCrumb current="Google Merchant Center" />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/integrations/merchant-center/feed"
          className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
        >
          Product feed
        </Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">
            Google Merchant Center Setting
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Stores the public Merchant ID. Enabling this publishes{" "}
            <Link href="/feeds/google.xml" className="text-[#3897f0]">
              /feeds/google.xml
            </Link>
            .
          </p>
          {formError ? (
            <Alert tone="danger" title="Could not save" className="mt-4">
              <p className="text-caption">{formError}</p>
            </Alert>
          ) : null}
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Merchant Center sync</span>
              <AdminToggleSwitch
                label="Enable Merchant Center"
                checked={enabled}
                onChange={setEnabled}
              />
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Merchant ID</span>
              <Input
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="123456789"
                className={controlClass}
              />
            </label>
            <div className="flex justify-end pt-2">
              <BlueSaveButton
                disabled={pending}
                onClick={() => {
                  setFormError(null);
                  startTransition(async () => {
                    const result = await saveMerchantCenterConfigAction({
                      isEnabled: enabled,
                      publicId: merchantId,
                    });
                    if (!result.ok) {
                      setFormError(result.formError);
                      notifyError(result.formError);
                      return;
                    }
                    notifySuccess("Merchant Center settings saved");
                    router.refresh();
                  });
                }}
              />
            </div>
          </div>
        </section>
        <InstructionCard title="Google Merchant Center Setup">
          <Step n={1}>Sign in to Google Merchant Center.</Step>
          <Step n={2}>Claim and verify your Techno House website.</Step>
          <Step n={3}>Copy your Merchant ID from the account menu.</Step>
          <Step n={4}>Paste Merchant ID here and enable the feed.</Step>
          <Step n={5}>
            Point Merchant Center at <code>/feeds/google.xml</code>.
          </Step>
          <NoteBox tone="yellow">
            Google Merchant API upload is deferred. The public XML feed lists
            active products (name, SKU, price, image, brand, category).
          </NoteBox>
        </InstructionCard>
      </div>
    </div>
  );
}

export function AdminCustomScriptPage({
  headerScript,
  footerScript,
  canManage,
}: {
  headerScript: string;
  footerScript: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [header, setHeader] = useState(headerScript);
  const [footer, setFooter] = useState(footerScript);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <AnalyticsCrumb current="Custom Scripts" />
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h1 className="text-lg font-semibold text-neutral-900">
          Custom Script
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Runs on every storefront page for every visitor, verbatim — not
          sanitized. Admin-only: anyone who can save here can run arbitrary
          JavaScript storefront-wide, so this is restricted to the Admin
          role.
        </p>
        {!canManage ? (
          <Alert tone="warning" title="Read-only" className="mt-4">
            <p className="text-caption">
              Your role can view these scripts but not change them.
            </p>
          </Alert>
        ) : null}
        {formError ? (
          <Alert tone="danger" title="Could not save" className="mt-4">
            <p className="text-caption">{formError}</p>
          </Alert>
        ) : null}
        <div className="mt-5 space-y-5">
          <label className="block space-y-1.5">
            <span className="text-sm text-neutral-600">
              Header custom script - before {"</head>"}
            </span>
            <Textarea
              rows={8}
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder={scriptPlaceholder}
              disabled={!canManage}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 font-mono text-sm disabled:opacity-60"
            />
            <span className="text-xs text-neutral-400">
              Write script with &lt;script&gt; tag — {header.length}/
              {CUSTOM_SCRIPT_MAX} characters
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-neutral-600">
              Footer custom script - before {"</body>"}
            </span>
            <Textarea
              rows={8}
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder={scriptPlaceholder}
              disabled={!canManage}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 font-mono text-sm disabled:opacity-60"
            />
            <span className="text-xs text-neutral-400">
              Write script with &lt;script&gt; tag — {footer.length}/
              {CUSTOM_SCRIPT_MAX} characters
            </span>
          </label>
          {canManage ? (
            <div className="flex justify-end">
              <GreenUpdateButton
                disabled={pending}
                onClick={() => {
                  setFormError(null);
                  startTransition(async () => {
                    const result = await saveCustomScriptsAction({
                      headerScript: header,
                      footerScript: footer,
                    });
                    if (!result.ok) {
                      setFormError(result.formError);
                      notifyError(result.formError);
                      return;
                    }
                    notifySuccess("Custom scripts updated");
                    router.refresh();
                  });
                }}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function AdminGlobalSeoPage({
  config,
  homeContentHtml,
}: {
  config: AdminSeoConfig;
  /** Sanitized homepage SEO copy, stored on the path "/" row. */
  homeContentHtml: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(config.title);
  const [description, setDescription] = useState(config.description);
  const [keywords, setKeywords] = useState(config.keywords);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [homeContent, setHomeContent] = useState(homeContentHtml);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [homePending, startHomeTransition] = useTransition();

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <AnalyticsCrumb current="Global SEO" />
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h1 className="text-lg font-semibold text-neutral-900">Global SEO</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Default title, description, and keywords for the storefront. Per-page
          overrides and OG image uploads stay deferred.
        </p>
        {formError ? (
          <Alert tone="danger" title="Could not save" className="mt-4">
            <p className="text-caption">{formError}</p>
          </Alert>
        ) : null}
        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">
              Meta Title
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Techno House"
              className={controlClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">
              Meta description
            </span>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technology products for work, study, and building a PC."
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">
              Keywords
            </span>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="laptops, pc builder, gadgets"
              className={controlClass}
            />
            <span className="text-xs text-neutral-400">
              Separate with commas
            </span>
          </label>
          <div className="flex justify-end pt-2">
            <GreenUpdateButton
              disabled={pending}
              onClick={() => {
                setFormError(null);
                startTransition(async () => {
                  const result = await saveGlobalSeoAction({
                    title,
                    description,
                    keywords,
                  });
                  if (!result.ok) {
                    setFormError(result.formError);
                    notifyError(result.formError);
                    return;
                  }
                  notifySuccess("Global SEO saved");
                  router.refresh();
                });
              }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-neutral-900">
          Homepage content
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Long-form copy rendered at the bottom of the homepage, below the
          product sections. Use headings and link into your categories — this
          is the homepage&rsquo;s main indexable text. Leave it empty to keep
          the built-in &ldquo;About Techno House&rdquo; block.
        </p>
        {homeError ? (
          <Alert tone="danger" title="Could not save" className="mt-4">
            <p className="text-caption">{homeError}</p>
          </Alert>
        ) : null}
        <div className="mt-5">
          <RichTextEditor
            value={homeContent}
            onChange={setHomeContent}
            disabled={homePending}
            placeholder="About your store — headings, paragraphs, links into your categories, comparison tables."
          />
        </div>
        <div className="flex justify-end pt-4">
          <GreenUpdateButton
            disabled={homePending}
            onClick={() => {
              setHomeError(null);
              startHomeTransition(async () => {
                const result = await saveHomeSeoContentAction({
                  html: homeContent,
                });
                if (!result.ok) {
                  setHomeError(result.formError);
                  notifyError(result.formError);
                  return;
                }
                notifySuccess("Homepage content saved");
                router.refresh();
              });
            }}
          />
        </div>
      </section>
    </div>
  );
}

export function AdminSitemapGeneratorPage({
  urlCount,
  updatedAt,
}: {
  urlCount: number;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const modified = updatedAt
    ? new Date(updatedAt).toLocaleString("en-GB")
    : "Built on request";

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <AnalyticsCrumb current="Sitemap Generator" />
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              Sitemap Generator
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Live XML from public pages, active catalog, and published posts.
              Files are not stored on disk.
            </p>
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setFormError(null);
              startTransition(async () => {
                const result = await refreshSitemapAction();
                if (!result.ok) {
                  setFormError(result.formError);
                  notifyError(result.formError);
                  return;
                }
                notifySuccess("Sitemap cache refreshed");
                router.refresh();
              });
            }}
            className="rounded-full bg-gradient-to-r from-red-500 to-orange-400 px-5 text-white hover:from-red-600 hover:to-orange-500"
          >
            {pending ? "Refreshing…" : "Refresh sitemap"}
          </Button>
        </div>
        {formError ? (
          <Alert tone="danger" title="Could not refresh" className="mt-4">
            <p className="text-caption">{formError}</p>
          </Alert>
        ) : null}
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Sitemap</dt>
            <dd>
              <Link
                href={SITEMAP_PATH}
                className="text-[#3897f0] hover:underline"
              >
                {SITEMAP_PATH}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Robots</dt>
            <dd>
              <Link
                href={ROBOTS_PATH}
                className="text-[#3897f0] hover:underline"
              >
                {ROBOTS_PATH}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Public URLs</dt>
            <dd className="tabular-nums text-neutral-900">{urlCount}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-neutral-500">
              <Clock3 className="size-3.5" aria-hidden />
              Last SEO save
            </dt>
            <dd className="text-neutral-900">{modified}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

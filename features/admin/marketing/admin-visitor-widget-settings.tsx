"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { saveVisitorWidgetSettingsAction } from "@/features/admin/marketing/visitor-widget-actions";
import type { VisitorWidgetSettingsView } from "@/lib/marketing/visitor-widget-settings";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminVisitorWidgetSettingsPage({
  settings,
}: {
  settings: VisitorWidgetSettingsView;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [windowMinutes, setWindowMinutes] = useState(
    String(settings.windowMinutes),
  );
  const [minToShow, setMinToShow] = useState(String(settings.minToShow));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveVisitorWidgetSettingsAction({
        enabled,
        windowMinutes: Number.parseInt(windowMinutes, 10),
        minToShow: Number.parseInt(minToShow, 10),
      });
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      notifySuccess("Visitor widget settings saved");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Custom Visitors
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Shows a real &ldquo;N people are viewing this&rdquo; note on product
          pages, based on genuine distinct page-view tracking (a random
          per-browser id — no accounts or IP addresses are used). Never inflated
          with fabricated numbers.
        </p>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <section className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-800">
            Show viewer counts on product pages
          </span>
          <AdminToggleSwitch
            label="Enable visitor widget"
            checked={enabled}
            onChange={setEnabled}
          />
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-700">
            Counting window (minutes)
          </span>
          <span className="block text-xs text-neutral-400">
            A visitor counts if they viewed this product within the last N
            minutes.
          </span>
          <Input
            type="number"
            min={1}
            max={1440}
            value={windowMinutes}
            onChange={(event) => setWindowMinutes(event.target.value)}
            className={controlClass}
            disabled={pending}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-700">
            Minimum viewers before showing
          </span>
          <span className="block text-xs text-neutral-400">
            Hides the note until at least this many distinct people are viewing.
          </span>
          <Input
            type="number"
            min={1}
            max={100}
            value={minToShow}
            onChange={(event) => setMinToShow(event.target.value)}
            className={controlClass}
            disabled={pending}
          />
        </label>
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={pending}
            className="bg-[#3897f0] hover:bg-[#2f86d8]"
            onClick={handleSave}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </section>
    </div>
  );
}

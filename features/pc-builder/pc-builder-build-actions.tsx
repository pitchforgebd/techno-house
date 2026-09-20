"use client";

import { Download, Printer, Share2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { cn } from "@/lib/cn";

const actionClassName =
  "flex flex-col items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-2.5 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft/60";
const disabledClassName =
  "cursor-not-allowed border-border bg-surface-muted/60 opacity-60 hover:border-border hover:bg-surface-muted/60";
const labelClassName = "text-caption font-semibold text-text";

/**
 * Download / Print / Share for a build's parts list.
 *
 * `sharePath` is the public share page for this build. Both Download and
 * Print go through that page's PDF route rather than the browser's own
 * print of the current page, so the output is the clean quote document
 * instead of a screenshot of the site with its header and footer.
 *
 * A guest build has no saved share slug — `sharePathForSelection()` encodes
 * the parts into the URL itself, so these work without signing in or saving.
 */
export function PcBuilderBuildActions({
  sharePath,
  buildName,
}: {
  sharePath: string | null;
  buildName: string;
}) {
  const enabled = Boolean(sharePath);

  async function handleShare() {
    if (!sharePath) {
      return;
    }
    const url = `${window.location.origin}${sharePath}`;
    // Native share sheet where supported; clipboard everywhere else. A
    // cancelled sheet rejects in most browsers — swallow that rather than
    // reporting "I changed my mind" as a failure.
    if (navigator.share) {
      try {
        await navigator.share({ title: buildName, url });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess("Link copied");
    } catch {
      notifyError({ title: "Could not copy the link" });
    }
  }

  if (!enabled) {
    return (
      <div className="grid grid-cols-3 gap-2 print:hidden" aria-hidden>
        {[
          { Icon: Download, label: "Download" },
          { Icon: Printer, label: "Print" },
          { Icon: Share2, label: "Share" },
        ].map(({ Icon, label }) => (
          <span key={label} className={cn(actionClassName, disabledClassName)}>
            <Icon className="size-5 text-text-muted" strokeWidth={1.75} />
            <span className={cn(labelClassName, "text-text-muted")}>{label}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 print:hidden">
      <a href={`${sharePath}/pdf`} download className={actionClassName}>
        <Download aria-hidden className="size-5 text-primary" strokeWidth={1.75} />
        <span className={labelClassName}>Download</span>
      </a>
      <button
        type="button"
        className={actionClassName}
        onClick={() => window.open(`${sharePath}/pdf?inline=1`, "_blank")}
      >
        <Printer aria-hidden className="size-5 text-primary" strokeWidth={1.75} />
        <span className={labelClassName}>Print</span>
      </button>
      <button
        type="button"
        className={actionClassName}
        onClick={() => void handleShare()}
      >
        <Share2 aria-hidden className="size-5 text-primary" strokeWidth={1.75} />
        <span className={labelClassName}>Share</span>
      </button>
    </div>
  );
}

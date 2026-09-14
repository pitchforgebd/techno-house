"use client";

import { Alert } from "@/components/ui/alert";
import type {
  CompatibilityResult,
  CompatibilityWarning,
} from "@/lib/domain/pc-builder";

function warningTone(
  status: CompatibilityWarning["status"],
): "danger" | "warning" | "info" {
  if (status === "incompatible") {
    return "danger";
  }
  if (status === "unknown") {
    return "warning";
  }
  return "info";
}

function warningTitle(status: CompatibilityWarning["status"]): string {
  if (status === "incompatible") {
    return "Incompatible";
  }
  if (status === "unknown") {
    return "Needs verification";
  }
  return "Note";
}

export function PcBuilderCompatibility({
  result,
  filledCount,
}: {
  result: CompatibilityResult | null;
  filledCount: number;
}) {
  if (filledCount === 0) {
    return (
      <div className="rounded-md border border-border bg-surface-muted/60 px-3 py-2">
        <p className="text-caption font-medium text-text">Compatibility</p>
        <p className="mt-0.5 text-caption text-text-muted">
          Select parts to run socket, memory, form-factor, PSU, and storage
          checks. Missing data never shows as compatible.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-md border border-border bg-surface-muted/60 px-3 py-2">
        <p className="text-caption font-medium text-text">Compatibility</p>
        <p className="mt-0.5 text-caption text-text-muted">
          Checking selected parts…
        </p>
      </div>
    );
  }

  const { warnings, checkedOk, hasIncompatible, hasUnknown } = result;

  return (
    <div className="space-y-2" aria-labelledby="pc-builder-compat-heading">
      <div className="rounded-md border border-border bg-surface-muted/60 px-3 py-2">
        <p
          id="pc-builder-compat-heading"
          className="text-caption font-medium text-text"
        >
          Compatibility
        </p>
        <p className="mt-0.5 text-caption text-text-muted">
          {hasIncompatible
            ? "One or more checks failed. Review the notes below."
            : hasUnknown
              ? "No hard conflicts found, but some checks need more product data."
              : checkedOk > 0
                ? `${checkedOk} check${checkedOk === 1 ? "" : "s"} passed with available data.`
                : "Not enough paired parts yet for a compatibility check."}
        </p>
      </div>

      {warnings.length > 0 ? (
        <ul className="space-y-2">
          {warnings.map((warning) => (
            <li key={`${warning.code}-${warning.message}`}>
              <Alert
                tone={warningTone(warning.status)}
                title={warningTitle(warning.status)}
              >
                <p className="text-caption">{warning.message}</p>
              </Alert>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

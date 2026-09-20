"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { PcBuilderStatusRow } from "@/features/pc-builder/pc-builder-status-row";
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
      <PcBuilderStatusRow icon={ShieldCheck} label="Compatibility">
        Select parts to run socket, memory, form-factor, PSU, and storage
        checks.
      </PcBuilderStatusRow>
    );
  }

  if (!result) {
    return (
      <PcBuilderStatusRow icon={ShieldCheck} label="Compatibility">
        Checking selected parts…
      </PcBuilderStatusRow>
    );
  }

  const { warnings, checkedOk, hasIncompatible, hasUnknown } = result;

  return (
    <div className="space-y-2">
      <PcBuilderStatusRow
        icon={hasIncompatible ? ShieldAlert : ShieldCheck}
        label="Compatibility"
        tone={
          hasIncompatible ? "danger" : hasUnknown ? "warning" : checkedOk > 0 ? "success" : "neutral"
        }
      >
        {hasIncompatible
          ? "One or more checks failed. Review the notes below."
          : hasUnknown
            ? "No hard conflicts found, but some checks need more product data."
            : checkedOk > 0
              ? `${checkedOk} check${checkedOk === 1 ? "" : "s"} passed with available data.`
              : "Not enough paired parts yet for a compatibility check."}
      </PcBuilderStatusRow>

      {warnings.length > 0 ? (
        <ul className="space-y-2 px-3 pb-1">
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

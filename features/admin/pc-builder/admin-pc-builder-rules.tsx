"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { AdminPcBuilderSubnav } from "@/features/admin/pc-builder/admin-pc-builder-subnav";
import {
  saveCompatibilityRulesAction,
  setCompatibilityRuleEnabledAction,
} from "@/features/admin/pc-builder/rule-actions";
import {
  InstructionCard,
  SetupCard,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { Alert } from "@/components/ui/alert";
import type { CompatibilityRule } from "@/lib/domain/pc-builder";

export function AdminPcBuilderRules({
  rules: initialRules,
}: {
  rules: CompatibilityRule[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleRule(key: string, enabled: boolean) {
    if (pending) {
      return;
    }
    const previous = rules;
    setError(null);
    setRules((current) =>
      current.map((rule) => (rule.key === key ? { ...rule, enabled } : rule)),
    );
    startTransition(async () => {
      const result = await setCompatibilityRuleEnabledAction({ key, enabled });
      if (!result.ok) {
        setRules(previous);
        setError(result.formError);
        return;
      }
      notifySuccess(enabled ? "Rule enabled" : "Rule disabled");
    });
  }

  function saveRules() {
    setError(null);
    startTransition(async () => {
      const result = await saveCompatibilityRulesAction(
        rules.map((rule) => ({ key: rule.key, enabled: rule.enabled })),
      );
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      notifySuccess("Compatibility rules saved");
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-4">
          <AdminPcBuilderSubnav />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Compatibility rules
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Enable checks the storefront builder can run. Missing product data
              still shows as unknown, never as a false match.
            </p>
          </div>
        </div>
        <Link
          href="/pc-builder"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6c5ce7] hover:underline"
        >
          View storefront builder
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <SetupCard title="Active rules" onSave={saveRules} saveLabel="Save">
        <div className="divide-y divide-neutral-100">
          {rules.map((rule) => (
            <div
              key={rule.key}
              className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900">
                  {rule.label}
                </p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-neutral-400">
                  {rule.type.replace("_", " ")}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {rule.description}
                </p>
              </div>
              <AdminToggleSwitch
                label={`Enable ${rule.label}`}
                checked={rule.enabled}
                onChange={() => toggleRule(rule.key, !rule.enabled)}
                activeClassName="bg-[#6c5ce7]"
              />
            </div>
          ))}
        </div>
      </SetupCard>

      <InstructionCard title="Rule engine">
        <p>
          These rows live in PostgreSQL. The storefront engine walks this type
          table and skips disabled types. Storage interface is unknown until
          both the drive and motherboard have that attribute. Missing data never
          shows as compatible.
        </p>
      </InstructionCard>
    </div>
  );
}

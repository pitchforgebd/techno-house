"use client";

import { AccountShell } from "@/features/account/account-shell";
import { CompareBody } from "@/features/lists/compare-body";

export function AccountCompareView() {
  return (
    <AccountShell title="Compare">
      <p className="text-caption text-text-muted">
        Same device-local compare set as the storefront. Same category only —
        not a saved server set.
      </p>
      <CompareBody className="mt-4" />
    </AccountShell>
  );
}

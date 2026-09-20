"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cpu, Link2, Trash2 } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { AccountShell } from "@/features/account/account-shell";
import { useBuilderStore } from "@/features/pc-builder/use-builder-store";
import { useSavedBuilds } from "@/features/pc-builder/use-saved-builds";
import { sharePathForSlug } from "@/lib/domain/pc-builder";

export function AccountBuildsView() {
  const router = useRouter();
  const { loadSelection } = useBuilderStore();
  const { builds, shareSaved, deleteBuild, pending, ready } = useSavedBuilds();
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCopy(buildId: string) {
    setCopyingId(buildId);
    const result = await shareSaved(buildId);
    setCopyingId(null);
    if (!result.ok || !result.sharePath) {
      notifyError({ title: "Could not create a share link" });
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${result.sharePath}`,
      );
      notifySuccess("Share link copied");
    } catch {
      notifyError({
        title: "Copy failed",
        description: result.sharePath,
      });
    }
  }

  async function handleDelete(buildId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) {
      return;
    }
    setDeletingId(buildId);
    await deleteBuild(buildId);
    setDeletingId(null);
  }

  return (
    <AccountShell title="My builds">
      <p className="text-caption text-text-muted">
        PC Builder configurations saved to your account. Load one back into
        the builder to keep editing, copy its share link, or remove it.
      </p>

      {!ready ? (
        <p className="mt-6 text-caption text-text-muted">Loading…</p>
      ) : builds.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No saved builds yet"
          description="Put together a PC in the builder and save it to your account to see it here."
          action={
            <Link href="/pc-builder" className={buttonClassName({ size: "sm" })}>
              Go to PC Builder
            </Link>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {builds.map((build) => (
            <li
              key={build.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
                >
                  <Cpu className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label font-semibold text-text">
                    {build.name}
                  </p>
                  <p className="text-caption text-text-muted">
                    Saved{" "}
                    {new Date(build.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {build.shareSlug ? (
                    <p className="mt-1 truncate font-mono text-caption text-text-muted">
                      {sharePathForSlug(build.shareSlug)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClassName({ size: "sm" })}
                  onClick={() => {
                    loadSelection(build.selection);
                    router.push("/pc-builder");
                  }}
                >
                  Load in builder
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: "gap-1.5",
                  })}
                  onClick={() => void handleCopy(build.id)}
                >
                  <Link2 aria-hidden className="size-3.5" />
                  {copyingId === build.id ? "Copying…" : "Copy link"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={buttonClassName({
                    size: "sm",
                    variant: "ghost",
                    className: "gap-1.5 border border-border",
                  })}
                  onClick={() => void handleDelete(build.id, build.name)}
                >
                  <Trash2 aria-hidden className="size-3.5" />
                  {deletingId === build.id ? "Removing…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}

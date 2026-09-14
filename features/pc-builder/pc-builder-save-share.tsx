"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSavedBuilds } from "@/features/pc-builder/use-saved-builds";
import {
  MAX_SAVED_BUILD_NAME,
  countFilledSlots,
  normalizeSavedBuildName,
  sharePathForSelection,
  sharePathForSlug,
  type BuildSelection,
} from "@/lib/domain/pc-builder";

async function copyUrl(path: string): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  const url = `${window.location.origin}${path}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function PcBuilderSaveShare({
  selection,
  onLoadSelection,
}: {
  selection: BuildSelection;
  onLoadSelection: (selection: BuildSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const {
    builds,
    saveBuild,
    shareCurrent,
    shareSaved,
    deleteBuild,
    pending,
    ready,
    persisted,
    error,
  } = useSavedBuilds();
  const filled = countFilledSlots(selection).filled;

  const guestSharePath = useMemo(
    () => sharePathForSelection(selection),
    [selection],
  );

  const displayedSharePath = persisted ? sharePath : guestSharePath;

  async function handleCopy() {
    setCopyStatus("idle");
    setSaveError(null);
    if (filled === 0) {
      return;
    }
    if (persisted) {
      const result = await shareCurrent(selection);
      if (!result.ok || !("sharePath" in result) || !result.sharePath) {
        setCopyStatus("failed");
        if (result.ok === false && "formError" in result && result.formError) {
          setSaveError(result.formError);
        }
        return;
      }
      setSharePath(result.sharePath);
      const copied = await copyUrl(result.sharePath);
      setCopyStatus(copied ? "copied" : "failed");
      return;
    }
    if (!guestSharePath) {
      return;
    }
    const copied = await copyUrl(guestSharePath);
    setCopyStatus(copied ? "copied" : "failed");
  }

  async function handleCopySaved(
    buildId: string,
    buildSelection: BuildSelection,
  ) {
    setCopyStatus("idle");
    setSaveError(null);
    if (persisted) {
      const result = await shareSaved(buildId);
      if (!result.ok || !("sharePath" in result) || !result.sharePath) {
        setCopyStatus("failed");
        if (result.ok === false && "formError" in result && result.formError) {
          setSaveError(result.formError);
        }
        return;
      }
      setSharePath(result.sharePath);
      const copied = await copyUrl(result.sharePath);
      setCopyStatus(copied ? "copied" : "failed");
      return;
    }
    const path = sharePathForSelection(buildSelection);
    if (!path) {
      setCopyStatus("failed");
      return;
    }
    const copied = await copyUrl(path);
    setCopyStatus(copied ? "copied" : "failed");
  }

  async function handleSave() {
    const trimmed = normalizeSavedBuildName(name);
    if (!trimmed) {
      setSaveError("Enter a short name for this build.");
      return;
    }
    if (filled === 0) {
      setSaveError("Select at least one part before saving.");
      return;
    }
    const result = await saveBuild(trimmed, selection);
    if (result && "ok" in result && !result.ok) {
      setSaveError(result.formError);
      return;
    }
    setName("");
    setSaveError(null);
  }

  return (
    <>
      <button
        type="button"
        disabled={filled === 0 && builds.length === 0}
        className={buttonClassName({
          variant: "secondary",
          className: "w-full",
        })}
        onClick={() => {
          setCopyStatus("idle");
          setSaveError(null);
          setSharePath(null);
          setOpen(true);
        }}
      >
        Save / share build
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Save & share">
        <div className="space-y-5">
          <Alert
            tone="info"
            title={persisted ? "Saved to your account" : "Saved on this device"}
          >
            <p className="text-caption">
              {persisted
                ? "These builds are stored on your account. Share links use a private token. The public page shows parts only — not your account."
                : "Sign in to keep builds on your account. Share links encode public product slugs only — no personal data."}
            </p>
          </Alert>

          <section className="space-y-3" aria-labelledby="share-build-heading">
            <h3
              id="share-build-heading"
              className="text-label font-semibold text-text"
            >
              Share link
            </h3>
            {filled > 0 ? (
              <>
                {displayedSharePath ? (
                  <p className="break-all rounded-md border border-border bg-surface-muted/60 px-3 py-2 font-mono text-caption text-text">
                    {displayedSharePath}
                  </p>
                ) : persisted ? (
                  <p className="text-caption text-text-muted">
                    Copy to create a private share link. Anyone with the link
                    can see the parts — not your account.
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={pending || !ready}
                  className={buttonClassName({
                    size: "sm",
                    className: "w-full",
                  })}
                  onClick={() => {
                    void handleCopy();
                  }}
                >
                  Copy share URL
                </button>
                {copyStatus === "copied" ? (
                  <p className="text-caption text-success" role="status">
                    Link copied.
                  </p>
                ) : null}
                {copyStatus === "failed" ? (
                  <p className="text-caption text-danger" role="alert">
                    Could not copy — select the path above manually.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-caption text-text-muted">
                Select at least one part to create a share link.
              </p>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="save-build-heading">
            <h3
              id="save-build-heading"
              className="text-label font-semibold text-text"
            >
              {persisted ? "Save to your account" : "Save on this device"}
            </h3>
            <Field
              label="Build name"
              htmlFor="saved-build-name"
              error={saveError ?? error ?? undefined}
              hint={`Up to ${MAX_SAVED_BUILD_NAME} characters.`}
            >
              <Input
                id="saved-build-name"
                value={name}
                maxLength={MAX_SAVED_BUILD_NAME}
                placeholder="e.g. Office AM5 build"
                onChange={(event) => {
                  setName(event.target.value);
                  setSaveError(null);
                }}
              />
            </Field>
            <button
              type="button"
              disabled={filled === 0 || pending || !ready}
              className={buttonClassName({
                size: "sm",
                variant: "secondary",
                className: "w-full",
              })}
              onClick={() => {
                void handleSave();
              }}
            >
              Save current build
            </button>
          </section>

          <section className="space-y-2" aria-labelledby="saved-list-heading">
            <h3
              id="saved-list-heading"
              className="text-label font-semibold text-text"
            >
              Saved builds
            </h3>
            {builds.length === 0 ? (
              <p className="text-caption text-text-muted">
                No saved builds yet.
              </p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {builds.map((build) => (
                  <li
                    key={build.id}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <p className="text-label font-medium text-text">
                      {build.name}
                    </p>
                    <p className="text-caption text-text-muted">
                      {new Date(build.createdAt).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {build.shareSlug ? (
                      <p className="mt-1 break-all font-mono text-caption text-text-muted">
                        {sharePathForSlug(build.shareSlug)}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={buttonClassName({ size: "sm" })}
                        onClick={() => {
                          onLoadSelection(build.selection);
                          setOpen(false);
                        }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className={buttonClassName({
                          size: "sm",
                          variant: "secondary",
                        })}
                        disabled={pending || !ready}
                        onClick={() => {
                          void handleCopySaved(build.id, build.selection);
                        }}
                      >
                        Copy link
                      </button>
                      <button
                        type="button"
                        className={buttonClassName({
                          size: "sm",
                          variant: "ghost",
                          className: "border border-border",
                        })}
                        disabled={pending}
                        onClick={() => {
                          void deleteBuild(build.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Dialog>
    </>
  );
}

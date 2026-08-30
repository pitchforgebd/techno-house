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
  type BuildSelection,
} from "@/lib/domain/pc-builder";

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
  const { builds, saveBuild, deleteBuild } = useSavedBuilds();
  const filled = countFilledSlots(selection).filled;

  const sharePath = useMemo(
    () => sharePathForSelection(selection),
    [selection],
  );

  async function handleCopy() {
    if (!sharePath || typeof window === "undefined") {
      return;
    }
    const url = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  function handleSave() {
    const trimmed = normalizeSavedBuildName(name);
    if (!trimmed) {
      setSaveError("Enter a short name for this build.");
      return;
    }
    if (filled === 0) {
      setSaveError("Select at least one part before saving.");
      return;
    }
    saveBuild(trimmed, selection);
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
          setOpen(true);
        }}
      >
        Save / share build
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Save & share">
        <div className="space-y-5">
          <Alert tone="info" title="Device-local mock">
            <p className="text-caption">
              Saved builds stay on this browser. Share links encode public
              product slugs only — no account or personal data. Server share
              tokens arrive in Phase 14.
            </p>
          </Alert>

          <section className="space-y-3" aria-labelledby="share-build-heading">
            <h3
              id="share-build-heading"
              className="text-label font-semibold text-text"
            >
              Share link
            </h3>
            {sharePath ? (
              <>
                <p className="break-all rounded-md border border-border bg-surface-muted/60 px-3 py-2 font-mono text-caption text-text">
                  {sharePath}
                </p>
                <button
                  type="button"
                  className={buttonClassName({
                    size: "sm",
                    className: "w-full",
                  })}
                  onClick={handleCopy}
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
              Save on this device
            </h3>
            <Field
              label="Build name"
              htmlFor="saved-build-name"
              error={saveError ?? undefined}
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
              disabled={filled === 0}
              className={buttonClassName({
                size: "sm",
                variant: "secondary",
                className: "w-full",
              })}
              onClick={handleSave}
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
                          variant: "ghost",
                          className: "border border-border",
                        })}
                        onClick={() => deleteBuild(build.id)}
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

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { saveAppearanceSettingsAction } from "@/features/admin/design-studio/theme-actions";
import { judgeContrast } from "@/lib/design/contrast";
import {
  THEME_COLOR_TOKEN_LIST,
  type ThemeColorGroup,
} from "@/lib/design/theme-tokens";
import type { AdminThemeSettings } from "@/lib/design/theme-settings";
import { cn } from "@/lib/cn";

/**
 * Admin → Design Studio → Appearance: the storefront brand palette.
 *
 * Every field here is generated from `THEME_COLOR_TOKEN_LIST`, so adding a
 * token to that table is the only edit needed to expose a new colour. The
 * alternative — a hand-written field per colour — is how a settings screen
 * drifts out of step with what the emitter actually applies.
 *
 * ## Empty means default, and the screen says so
 *
 * A colour the operator has never set is stored as NULL, and the emitter then
 * writes no override at all so the value compiled into `app/globals.css`
 * applies. That is the mechanism, and the UI mirrors it rather than hiding it:
 * an unset field shows its default with a "Default" chip, and "Reset" clears
 * the stored value instead of writing the default back as an override. Writing
 * the default in would look identical today and silently pin the colour if the
 * design system ever changed.
 *
 * ## The preview is the real thing
 *
 * Tailwind v4 compiles every utility to `var(--color-…)`, so setting those
 * variables on one wrapper element retints everything inside it. The preview
 * below is not a mock-up with its own styles — it is ordinary storefront
 * markup under a scoped set of variables, which is why it cannot drift from
 * what the storefront will look like after saving.
 *
 * Values reach `style` only after passing the same `#rrggbb` test the server
 * enforces, so a half-typed hex never becomes a CSS declaration.
 */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const GROUPS: { id: ThemeColorGroup; title: string; hint: string }[] = [
  {
    id: "brand",
    title: "Brand colours",
    hint: "The palette customers read as your identity.",
  },
  {
    id: "surface",
    title: "Text & surfaces",
    hint: "The page underneath the brand — backgrounds, cards, body copy.",
  },
  {
    id: "button",
    title: "Buttons",
    hint: "Button background follows Primary. These two are the rest of it.",
  },
  {
    id: "chrome",
    title: "Header & footer",
    hint: "The dark bands at the top and bottom of every page. Separate from body text, so a campaign palette here leaves your paragraphs alone.",
  },
];

type Draft = Record<string, string>;

function draftFromSettings(settings: AdminThemeSettings): Draft {
  const draft: Draft = {};
  for (const token of THEME_COLOR_TOKEN_LIST) {
    draft[token.field] = (settings[token.field] as string) || "";
  }
  return draft;
}

/** What the colour renders as right now — the override, or the default. */
function effective(draft: Draft, field: string, fallback: string): string {
  const value = draft[field] ?? "";
  return HEX_COLOR.test(value) ? value : fallback;
}

function ContrastNote({
  foreground,
  background,
  context,
}: {
  foreground: string;
  background: string;
  context: string;
}) {
  const verdict = judgeContrast(foreground, background);
  if (!verdict) {
    return null;
  }
  return (
    <p
      className={cn(
        "text-xs",
        verdict.passesText
          ? "text-neutral-400"
          : verdict.passesLarge
            ? "text-amber-600"
            : "text-red-600",
      )}
    >
      {context}: {verdict.label}
    </p>
  );
}

export function AdminAppearanceColors({
  settings,
}: {
  settings: AdminThemeSettings;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const saved = useMemo(() => draftFromSettings(settings), [settings]);
  const [draft, setDraft] = useState<Draft>(saved);

  const dirty = THEME_COLOR_TOKEN_LIST.some(
    (token) => (draft[token.field] ?? "") !== (saved[token.field] ?? ""),
  );
  const invalid = THEME_COLOR_TOKEN_LIST.filter((token) => {
    const value = draft[token.field] ?? "";
    return value !== "" && !HEX_COLOR.test(value);
  });

  function set(field: string, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function save(next: Draft) {
    startTransition(async () => {
      const payload = Object.fromEntries(
        THEME_COLOR_TOKEN_LIST.map((token) => [
          token.field,
          next[token.field] ?? "",
        ]),
      ) as Parameters<typeof saveAppearanceSettingsAction>[0];

      const result = await saveAppearanceSettingsAction(payload);
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setDraft(next);
      notifySuccess("Appearance saved — the storefront is using it now");
      // The storefront reads the theme per request, so a refresh is all the
      // propagation there is. No deploy, no cache to clear.
      router.refresh();
    });
  }

  // Live preview values, all resolved through the same fallback the storefront
  // uses, so an unset or half-typed colour previews as its default.
  const previewVars = Object.fromEntries(
    THEME_COLOR_TOKEN_LIST.map((token) => [
      token.cssVariable,
      effective(draft, token.field, token.defaultValue),
    ]),
  ) as React.CSSProperties;

  const primary = effective(draft, "themeBaseColor", "#0b5ed7");
  const onPrimary = effective(draft, "themeOnPrimaryColor", "#ffffff");
  const bodyText = effective(draft, "themeTextColor", "#051c39");
  const surface = effective(draft, "themeSurfaceColor", "#ffffff");
  const background = effective(draft, "themeBackgroundColor", "#f4f7fb");
  const headerBg = effective(draft, "themeHeaderBgColor", "#051c39");
  const headerText = effective(draft, "themeHeaderTextColor", "#ffffff");
  const footerBg = effective(draft, "themeFooterBgColor", "#051c39");
  const footerText = effective(draft, "themeFooterTextColor", "#ffffff");

  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          Storefront colours
        </h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Applies to the live storefront as soon as you save. Status colours —
          success, warning, error, stock and payment badges — are deliberately
          not here, so rebranding cannot make an &ldquo;out of stock&rdquo;
          warning look like an ordinary label.
        </p>
      </div>

      <div className="space-y-7 px-5 py-5">
        {GROUPS.map((group) => (
          <div key={group.id}>
            <h3 className="text-sm font-semibold text-neutral-900">
              {group.title}
            </h3>
            <p className="mt-0.5 text-xs text-neutral-400">{group.hint}</p>
            <div className="mt-3 space-y-3">
              {THEME_COLOR_TOKEN_LIST.filter(
                (token) => token.group === group.id,
              ).map((token) => {
                const value = draft[token.field] ?? "";
                const isDefault = value === "";
                const malformed = value !== "" && !HEX_COLOR.test(value);
                const swatch = effective(
                  draft,
                  token.field,
                  token.defaultValue,
                );
                return (
                  <div
                    key={token.field}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:items-start sm:gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-800">
                        {token.label}
                        {isDefault ? (
                          <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {token.description}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-9 shrink-0 rounded-md border border-neutral-200"
                          style={{ backgroundColor: swatch }}
                        />
                        <Input
                          value={value}
                          placeholder={token.defaultValue}
                          onChange={(event) =>
                            set(token.field, event.target.value.trim())
                          }
                          aria-label={`${token.label} hex value`}
                          aria-invalid={malformed || undefined}
                          className={cn(
                            "h-9 w-full rounded-md border bg-white px-3 font-mono text-sm shadow-sm focus:outline-none focus:ring-2",
                            malformed
                              ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                              : "border-neutral-200 focus:border-[#3897f0] focus:ring-[#3897f0]/15",
                          )}
                        />
                        <input
                          type="color"
                          value={swatch}
                          onChange={(event) =>
                            set(token.field, event.target.value)
                          }
                          className="size-9 shrink-0 cursor-pointer rounded-md border border-neutral-200"
                          aria-label={`${token.label} colour picker`}
                        />
                        <button
                          type="button"
                          onClick={() => set(token.field, "")}
                          disabled={isDefault}
                          title={`Reset ${token.label} to ${token.defaultValue}`}
                          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <RotateCcw className="size-4" aria-hidden />
                          <span className="sr-only">
                            Reset {token.label} to default
                          </span>
                        </button>
                      </div>
                      {malformed ? (
                        <p className="mt-1 text-xs text-red-600">
                          Use a six-digit hex colour, like {token.defaultValue}.
                        </p>
                      ) : (
                        <p className="mt-1 font-mono text-[11px] text-neutral-400">
                          {token.cssVariable}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* --- Preview ----------------------------------------------------- */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Preview</h3>
          <p className="mt-0.5 text-xs text-neutral-400">
            Real storefront markup under your chosen colours. Nothing is saved
            yet.
          </p>
          <div
            style={previewVars}
            className="mt-3 rounded-lg border border-neutral-200 bg-background p-5"
          >
            <div className="rounded-md border border-border bg-surface p-4">
              <p className="text-base font-semibold text-text">
                Featured product
              </p>
              <p className="mt-1 text-sm text-text-muted">
                A short description, in muted body copy.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                  Add to cart
                </span>
                <span className="rounded-md bg-primary-hover px-3 py-1.5 text-sm font-medium text-primary-foreground">
                  Hover
                </span>
                <span className="rounded-md bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary">
                  Soft tint
                </span>
                <span className="text-sm font-medium text-primary underline">
                  A link
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Status colours are NOT themeable, and the preview shows it:
                    these must keep meaning the same thing after a rebrand. */}
                <span className="rounded bg-success/10 px-2 py-1 text-xs font-medium text-success">
                  In stock
                </span>
                <span className="rounded bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                  Low stock
                </span>
                <span className="rounded bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                  Out of stock
                </span>
                <span className="text-[11px] text-neutral-400">
                  not themeable
                </span>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-secondary p-4">
              <p className="text-sm font-medium text-primary-bright">
                Accent on the dark panel
              </p>
            </div>
            <div className="mt-3 overflow-hidden rounded-md">
              <div className="bg-header-background px-4 py-2.5 text-header-text">
                <span className="text-sm font-bold tracking-tight">
                  Techno House
                </span>
                <span className="ml-3 text-xs text-header-text/70">
                  Header band
                </span>
              </div>
              <div className="bg-footer-background px-4 py-2.5 text-footer-text">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Footer band
                </span>
                <span className="ml-3 text-xs text-footer-text/70">
                  Muted footer link
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-0.5">
            <ContrastNote
              foreground={onPrimary}
              background={primary}
              context="Button text on button"
            />
            <ContrastNote
              foreground={bodyText}
              background={surface}
              context="Body text on cards"
            />
            <ContrastNote
              foreground={bodyText}
              background={background}
              context="Body text on the page"
            />
            <ContrastNote
              foreground={headerText}
              background={headerBg}
              context="Header text on header"
            />
            <ContrastNote
              foreground={footerText}
              background={footerBg}
              context="Footer text on footer"
            />
          </div>
        </div>
      </div>

      {/* --- Actions -------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const cleared: Draft = {};
            for (const token of THEME_COLOR_TOKEN_LIST) {
              cleared[token.field] = "";
            }
            setDraft(cleared);
          }}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
        >
          Reset all to defaults
        </button>
        <div className="flex items-center gap-3">
          {invalid.length > 0 ? (
            <span className="text-xs text-red-600">
              {invalid.length} colour{invalid.length === 1 ? "" : "s"} need a
              valid hex value
            </span>
          ) : dirty ? (
            <span className="text-xs text-neutral-400">Unsaved changes</span>
          ) : null}
          <button
            type="button"
            disabled={pending || invalid.length > 0 || !dirty}
            onClick={() => save(draft)}
            className="inline-flex h-9 items-center rounded-md bg-[#1f9d55] px-4 text-sm font-semibold text-white hover:bg-[#188044] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </section>
  );
}

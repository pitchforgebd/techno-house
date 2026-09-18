"use client";

import { Input } from "@/components/ui/input";
import { AdminAppearanceColors } from "@/features/admin/design-studio/admin-appearance-colors";
import type { AdminThemeSettings } from "@/lib/design/theme-settings";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import {
  AdminToggleSwitch,
  ColorField,
  DashedUpload,
  Field,
  StudioBackLink,
  StudioCard,
  controlClass,
} from "@/features/admin/design-studio/studio-ui";
import {
  saveLogoHeightAction,
  uploadBrandLogoAction,
} from "@/features/admin/settings/branding-actions";
import {
  clampLogoHeight,
  logoStyle,
  LOGO_HEIGHT_MAX,
  LOGO_HEIGHT_MIN,
} from "@/lib/business/logo-size";
import {
  saveAdminNavSettingsAction,
  saveAuthPageSettingsAction,
  saveTypographySettingsAction,
  saveWatermarkSettingsAction,
  uploadDesignImageAction,
} from "@/features/admin/design-studio/theme-actions";

/** Mirrors AdminThemeSettings in lib/design/theme-settings.ts (server-only, not importable from a client component). */
/**
 * Was a hand-written structural copy of `AdminThemeSettings`. Aliasing it
 * instead means a column added to the settings type reaches these screens
 * as a compile error rather than as a field that silently does not exist —
 * which is exactly how this copy fell behind in the first place.
 *
 * `bodyFont` and `headingFont` are the narrower `FontChoice` union on the real
 * type; these screens only read them as strings, so nothing here needs
 * widening.
 */
type AdminThemeSettingsProp = AdminThemeSettings;

async function uploadDesignImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.set("file", file);
  const result = await uploadDesignImageAction(formData);
  if (!result.ok) {
    notifyError(result.formError);
    return null;
  }
  return result.path ?? null;
}

function PageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        <div className="mt-1">
          <StudioBackLink />
        </div>
      </div>
      {children}
    </div>
  );
}

export function AdminStudioAppearancePage({
  settings,
}: {
  settings: AdminThemeSettingsProp;
}) {
  return (
    <PageShell title="Appearance">
      <AdminAppearanceColors settings={settings} />
      <AdminStudioWatermarkCard settings={settings} />
    </PageShell>
  );
}

function AdminStudioWatermarkCard({
  settings,
}: {
  settings: AdminThemeSettingsProp;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useState(settings.watermarkEnabled);
  const [type, setType] = useState(settings.watermarkType || "image");
  const [imageSrc, setImageSrc] = useState(settings.watermarkImageSrc);
  const [position, setPosition] = useState(settings.watermarkPosition);
  return (
    <StudioCard
      title="Image Watermark"
      hint="Settings save for real. Automatic watermarking on upload isn't implemented yet."
      onUpdate={() => {
        startTransition(async () => {
          const result = await saveWatermarkSettingsAction({
            enabled: on,
            type,
            imageSrc,
            position,
          });
          if (!result.ok) {
            notifyError(result.formError);
            return;
          }
          notifySuccess("Watermark settings saved");
          router.refresh();
        });
      }}
      updateLabel={pending ? "Saving…" : "Update"}
    >
      <div className="flex items-center gap-3">
        <AdminToggleSwitch
          label="Use Image Watermark (During Upload)"
          checked={on}
          onChange={setOn}
        />
        <span className="text-sm text-neutral-700">
          Use Image Watermark (During Upload)
        </span>
      </div>
      <Field label="Watermark Type">
        <select value={type} onChange={(e) => setType(e.target.value)} className={controlClass}>
          <option value="image">Image</option>
          <option value="text">Text</option>
        </select>
      </Field>
      <Field
        label="Watermark Image"
        hint={`Recommended 300px × 300px, square, transparent PNG. Scales to fit each product image. Do not use "svg" image.`}
      >
        <DashedUpload
          previewSrc={imageSrc || null}
          disabled={pending}
          onFile={(file) => {
            startTransition(async () => {
              const path = await uploadDesignImage(file);
              if (path) setImageSrc(path);
            });
          }}
        />
      </Field>
      <Field label="Watermark Position">
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className={controlClass}
        >
          <option value="">Nothing selected</option>
          <option value="center">Center</option>
          <option value="bottom-right">Bottom right</option>
          <option value="bottom-left">Bottom left</option>
        </select>
      </Field>
    </StudioCard>
  );
}

const FONT_OPTIONS = [
  { value: "", label: "Site default" },
  { value: "inter", label: "Inter" },
  { value: "noto-bengali", label: "Noto Sans Bengali" },
  { value: "system-ui", label: "System UI" },
] as const;

export function AdminStudioTypographyPage({
  settings,
}: {
  settings: AdminThemeSettingsProp;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Held as plain strings because that is what a <select> gives back. The
  // narrowing to a known font happens server-side in `saveTypographySettings`,
  // which is the only place it is load-bearing.
  const [body, setBody] = useState<string>(settings.bodyFont);
  const [heading, setHeading] = useState<string>(settings.headingFont);
  return (
    <PageShell title="Typography">
      <StudioCard
        title="Choose your Fonts"
        hint="Real — changes the live storefront's body/heading font immediately."
        onUpdate={() => {
          startTransition(async () => {
            const result = await saveTypographySettingsAction({
              bodyFont: body,
              headingFont: heading,
            });
            if (!result.ok) {
              notifyError(result.formError);
              return;
            }
            notifySuccess("Typography saved — storefront fonts updated");
            router.refresh();
          });
        }}
        updateLabel={pending ? "Saving…" : "Update"}
      >
        <Field label="Body font">
          <select value={body} onChange={(e) => setBody(e.target.value)} className={controlClass}>
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Heading font">
          <select
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            className={controlClass}
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </StudioCard>
    </PageShell>
  );
}

export function AdminStudioLogoPage({
  settings,
}: {
  settings: {
    logoSrc: string;
    faviconSrc: string;
    logoHeightPx: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [logoSrc, setLogoSrc] = useState(settings.logoSrc);
  const [faviconSrc, setFaviconSrc] = useState(settings.faviconSrc);
  const [logoHeight, setLogoHeight] = useState(settings.logoHeightPx);

  function saveHeight(next: number) {
    const clamped = clampLogoHeight(next);
    setLogoHeight(clamped);
    startTransition(async () => {
      const result = await saveLogoHeightAction(clamped);
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(`Logo height set to ${clamped}px`);
      router.refresh();
    });
  }

  function uploadSlot(
    slot: "logoSrc" | "faviconSrc",
    file: File,
  ) {
    const formData = new FormData();
    formData.set("slot", slot);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadBrandLogoAction(formData);
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Logo saved — storefront will use it");
      router.refresh();
    });
  }

  return (
    <PageShell title="Logo & Favicon">
      <StudioCard
        title="Logo & Favicon"
        onUpdate={() => {
          notifySuccess("Current logos are already saved on upload");
        }}
      >
        <Field
          label="Store logo"
          hint="Displayed height is adjustable from 16px-96px with Logo size below (default 32px), width auto — transparent PNG or SVG recommended. Shown in the storefront header and footer. Upload saves immediately."
        >
          <DashedUpload
            previewSrc={logoSrc || null}
            disabled={pending}
            onFile={(file) => {
              const url = URL.createObjectURL(file);
              setLogoSrc(url);
              uploadSlot("logoSrc", file);
            }}
          />
        </Field>
        <Field
          label="Logo size"
          hint="Rendered height in the storefront header and footer. Width follows the logo's own proportions, so it is never stretched."
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={LOGO_HEIGHT_MIN}
                max={LOGO_HEIGHT_MAX}
                step={1}
                value={logoHeight}
                disabled={pending}
                onChange={(e) => setLogoHeight(Number(e.target.value))}
                onMouseUp={(e) => saveHeight(Number(e.currentTarget.value))}
                onKeyUp={(e) => saveHeight(Number(e.currentTarget.value))}
                onTouchEnd={(e) => saveHeight(Number(e.currentTarget.value))}
                className="h-1.5 flex-1 cursor-pointer accent-[#3897f0]"
                aria-label="Logo height in pixels"
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <Input
                  type="number"
                  min={LOGO_HEIGHT_MIN}
                  max={LOGO_HEIGHT_MAX}
                  value={logoHeight}
                  disabled={pending}
                  onChange={(e) => setLogoHeight(Number(e.target.value))}
                  onBlur={(e) => saveHeight(Number(e.target.value))}
                  className="w-20 text-center"
                />
                <span className="text-sm text-neutral-500">px</span>
              </div>
            </div>

            {/*
              Preview on the real dark chrome at the real height, so the
              number is judged against what the storefront will show rather
              than against a white admin card.
            */}
            <div className="flex items-center gap-3 rounded-md bg-[#0b1b2b] px-4 py-3">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded asset
                <img
                  src={logoSrc}
                  alt="Logo preview"
                  style={logoStyle(logoHeight)}
                  className="object-contain"
                />
              ) : (
                <span className="text-sm text-white/60">
                  Upload a logo to preview it here.
                </span>
              )}
              <span className="ml-auto text-xs text-white/50">
                {logoHeight}px tall · header preview
              </span>
            </div>
          </div>
        </Field>

        <Field
          label="Favicon"
          hint="Browser tab icon. Minimum 32×32. Upload saves immediately."
        >
          <DashedUpload
            previewSrc={faviconSrc || null}
            disabled={pending}
            onFile={(file) => {
              const url = URL.createObjectURL(file);
              setFaviconSrc(url);
              uploadSlot("faviconSrc", file);
            }}
          />
        </Field>
      </StudioCard>
    </PageShell>
  );
}

export function AdminStudioAuthPage({
  settings,
}: {
  settings: AdminThemeSettingsProp;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bg, setBg] = useState(settings.authBgColor || "#125E6A");
  const [panel, setPanel] = useState(settings.authPanelColor || "#ffffff");
  const [illustrationSrc, setIllustrationSrc] = useState(settings.authIllustrationSrc);
  return (
    <PageShell title="Auth pages">
      <StudioCard
        title="Login & register layout"
        hint="Real — changes the live sign-in/register/forgot-password pages immediately."
        onUpdate={() => {
          startTransition(async () => {
            const result = await saveAuthPageSettingsAction({
              bgColor: bg,
              panelColor: panel,
              illustrationSrc,
            });
            if (!result.ok) {
              notifyError(result.formError);
              return;
            }
            notifySuccess("Auth pages saved");
            router.refresh();
          });
        }}
        updateLabel={pending ? "Saving…" : "Update"}
      >
        <ColorField label="Page background" value={bg} onChange={setBg} />
        <ColorField label="Form panel" value={panel} onChange={setPanel} />
        <Field
          label="Login illustration"
          hint="Optional image beside the form. Minimum 600×600."
        >
          <DashedUpload
            previewSrc={illustrationSrc || null}
            disabled={pending}
            onFile={(file) => {
              startTransition(async () => {
                const path = await uploadDesignImage(file);
                if (path) setIllustrationSrc(path);
              });
            }}
          />
        </Field>
      </StudioCard>
    </PageShell>
  );
}

export function AdminStudioAdminNavbarPage({
  settings,
}: {
  settings: AdminThemeSettingsProp;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bg, setBg] = useState(settings.adminNavBgColor || "#2c1844");
  const [text, setText] = useState(settings.adminNavTextColor || "#ffffff");
  return (
    <PageShell title="Admin navbar">
      <StudioCard
        title="Navbar Background & Text Color"
        hint="Real — changes this admin panel's own sidebar immediately."
        onUpdate={() => {
          startTransition(async () => {
            const result = await saveAdminNavSettingsAction({
              bgColor: bg,
              textColor: text,
            });
            if (!result.ok) {
              notifyError(result.formError);
              return;
            }
            notifySuccess("Admin navbar saved");
            router.refresh();
          });
        }}
        updateLabel={pending ? "Saving…" : "Update"}
      >
        <ColorField label="Navbar background" hint="Hex Color Code" value={bg} onChange={setBg} />
        <ColorField label="Navbar text" hint="Hex Color Code" value={text} onChange={setText} />
      </StudioCard>
    </PageShell>
  );
}

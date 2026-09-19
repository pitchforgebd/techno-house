"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import {
  saveFooterWidgetsAction,
  uploadFooterPaymentImageAction,
} from "@/features/admin/design-studio/footer-actions";
import {
  AdminToggleSwitch,
  Field,
  Input,
  StudioBackLink,
  StudioCard,
  Textarea,
  controlClass,
} from "@/features/admin/design-studio/studio-ui";
import { saveBrandContactAction } from "@/features/admin/settings/branding-actions";
import {
  FOOTER_SOCIAL_NETWORKS,
  type FooterExtraContact,
  type FooterNavColumn,
  type FooterSocialItem,
  type FooterSocialNetwork,
  type FooterWidgetsConfig,
} from "@/lib/content/footer-types";

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

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AdminStudioFooterWidgetsPage({
  contact,
  initialConfig,
}: {
  contact: { phone: string; supportEmail: string; address: string };
  initialConfig: FooterWidgetsConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [config, setConfig] = useState<FooterWidgetsConfig>(initialConfig);
  const [address, setAddress] = useState(contact.address);
  const [phone, setPhone] = useState(contact.phone);
  const [email, setEmail] = useState(contact.supportEmail);

  function patch(partial: Partial<FooterWidgetsConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  function saveConfig(next: FooterWidgetsConfig = config) {
    startTransition(async () => {
      const result = await saveFooterWidgetsAction({ config: next });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Footer widgets saved — storefront updated");
      router.refresh();
    });
  }

  function updateColumn(columnId: string, updater: (col: FooterNavColumn) => FooterNavColumn) {
    setConfig((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId ? updater(col) : col,
      ),
    }));
  }

  return (
    <PageShell title="Footer widgets">
      <p className="text-sm text-neutral-500">
        Everything here drives the live storefront footer. Add or remove link
        columns, social profiles, and copy — then Update.
      </p>

      <StudioCard
        title="About widget"
        onUpdate={() => saveConfig()}
      >
        <Field label="About description">
          <Textarea
            value={config.aboutDescription}
            onChange={(e) => patch({ aboutDescription: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            disabled={pending}
          />
        </Field>
        <p className="text-xs text-neutral-500">
          Logo comes from Design Studio → Logo (dark chrome logo preferred).
        </p>
      </StudioCard>

      <StudioCard title="Social links" onUpdate={() => saveConfig()}>
        <label className="flex items-center gap-2 text-sm">
          <AdminToggleSwitch
            label="Enable social links"
            checked={config.showSocial}
            onChange={(checked) => patch({ showSocial: checked })}
          />
          Enable social links
        </label>
        <div className="space-y-3">
          {config.socialLinks.map((item, index) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2">
              <select
                className={controlClass}
                value={item.network}
                disabled={pending}
                onChange={(e) => {
                  const network = e.target.value as FooterSocialNetwork;
                  const next = [...config.socialLinks];
                  next[index] = { ...item, network };
                  patch({ socialLinks: next });
                }}
              >
                {FOOTER_SOCIAL_NETWORKS.map((network) => (
                  <option key={network} value={network}>
                    {network}
                  </option>
                ))}
              </select>
              <Input
                value={item.href}
                onChange={(e) => {
                  const next = [...config.socialLinks];
                  next[index] = { ...item, href: e.target.value };
                  patch({ socialLinks: next });
                }}
                placeholder="https://"
                className={controlClass}
                disabled={pending}
              />
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                aria-label="Remove social link"
                disabled={pending}
                onClick={() =>
                  patch({
                    socialLinks: config.socialLinks.filter(
                      (row) => row.id !== item.id,
                    ),
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          disabled={pending || config.socialLinks.length >= 8}
          onClick={() => {
            const row: FooterSocialItem = {
              id: newId("social"),
              network: "Facebook",
              href: "https://",
            };
            patch({ socialLinks: [...config.socialLinks, row] });
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add social link
        </button>
      </StudioCard>

      <StudioCard title="Link columns" onUpdate={() => saveConfig()}>
        <p className="text-xs text-neutral-500">
          These columns appear in the middle of the footer (e.g. Company,
          Policies). Add columns and links freely.
        </p>
        <div className="space-y-6">
          {config.columns.map((column) => (
            <div
              key={column.id}
              className="space-y-3 rounded-md border border-neutral-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={column.title}
                  onChange={(e) =>
                    updateColumn(column.id, (col) => ({
                      ...col,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Column title"
                  className={controlClass}
                  disabled={pending}
                />
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  aria-label={`Remove ${column.title || "column"}`}
                  disabled={pending}
                  onClick={() =>
                    patch({
                      columns: config.columns.filter(
                        (col) => col.id !== column.id,
                      ),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              <div className="space-y-2">
                {column.links.map((link, linkIndex) => (
                  <div
                    key={link.id}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <Input
                      value={link.label}
                      onChange={(e) =>
                        updateColumn(column.id, (col) => {
                          const links = [...col.links];
                          links[linkIndex] = {
                            ...link,
                            label: e.target.value,
                          };
                          return { ...col, links };
                        })
                      }
                      placeholder="Label"
                      className={controlClass}
                      disabled={pending}
                    />
                    <Input
                      value={link.href}
                      onChange={(e) =>
                        updateColumn(column.id, (col) => {
                          const links = [...col.links];
                          links[linkIndex] = {
                            ...link,
                            href: e.target.value,
                          };
                          return { ...col, links };
                        })
                      }
                      placeholder="/page or https://"
                      className={controlClass}
                      disabled={pending}
                    />
                    <button
                      type="button"
                      className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                      aria-label="Remove link"
                      disabled={pending}
                      onClick={() =>
                        updateColumn(column.id, (col) => ({
                          ...col,
                          links: col.links.filter((row) => row.id !== link.id),
                        }))
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
                disabled={pending}
                onClick={() =>
                  updateColumn(column.id, (col) => ({
                    ...col,
                    links: [
                      ...col.links,
                      {
                        id: newId("link"),
                        label: "New link",
                        href: "/",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" aria-hidden />
                Add link
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          disabled={pending || config.columns.length >= 6}
          onClick={() =>
            patch({
              columns: [
                ...config.columns,
                {
                  id: newId("col"),
                  title: "New column",
                  links: [],
                },
              ],
            })
          }
        >
          <Plus className="size-4" aria-hidden />
          Add column
        </button>
      </StudioCard>

      <StudioCard
        title="Contact info"
        onUpdate={() => {
          startTransition(async () => {
            const contactResult = await saveBrandContactAction({
              phone,
              supportEmail: email,
              address,
            });
            if (!contactResult.ok) {
              notifyError(contactResult.formError);
              return;
            }
            const footerResult = await saveFooterWidgetsAction({ config });
            if (!footerResult.ok) {
              notifyError(footerResult.formError);
              return;
            }
            notifySuccess("Contact info saved — storefront updated");
            router.refresh();
          });
        }}
      >
        <Field label="Contact address">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={controlClass}
            disabled={pending}
          />
        </Field>
        <Field label="Contact phone">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={controlClass}
            disabled={pending}
          />
        </Field>
        <Field label="Contact email">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={controlClass}
            disabled={pending}
          />
        </Field>
        <Field label="Hours / extra line">
          <Input
            value={config.contactHours}
            onChange={(e) => patch({ contactHours: e.target.value })}
            className={controlClass}
            disabled={pending}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <AdminToggleSwitch
            label="Show contact form link"
            checked={config.showContactFormLink}
            onChange={(checked) => patch({ showContactFormLink: checked })}
          />
          Show contact form link
        </label>

        <div className="space-y-3 border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-500">
            Extra branches/offices shown below the main contact block in the
            footer. Each one can set an address, phone, and email — leave any
            field blank to skip it.
          </p>
          {config.extraContacts.map((item, index) => (
            <div
              key={item.id}
              className="space-y-2 rounded-md border border-neutral-200 p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => {
                    const next = [...config.extraContacts];
                    next[index] = { ...item, label: e.target.value };
                    patch({ extraContacts: next });
                  }}
                  placeholder="Branch name (optional)"
                  className={controlClass}
                  disabled={pending}
                />
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  aria-label="Remove branch"
                  disabled={pending}
                  onClick={() =>
                    patch({
                      extraContacts: config.extraContacts.filter(
                        (row) => row.id !== item.id,
                      ),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              <Input
                value={item.address}
                onChange={(e) => {
                  const next = [...config.extraContacts];
                  next[index] = { ...item, address: e.target.value };
                  patch({ extraContacts: next });
                }}
                placeholder="Address"
                className={controlClass}
                disabled={pending}
              />
              <div className="flex flex-wrap gap-2">
                <Input
                  value={item.phone}
                  onChange={(e) => {
                    const next = [...config.extraContacts];
                    next[index] = { ...item, phone: e.target.value };
                    patch({ extraContacts: next });
                  }}
                  placeholder="Phone"
                  className={controlClass}
                  disabled={pending}
                />
                <Input
                  value={item.email}
                  onChange={(e) => {
                    const next = [...config.extraContacts];
                    next[index] = { ...item, email: e.target.value };
                    patch({ extraContacts: next });
                  }}
                  placeholder="Email"
                  className={controlClass}
                  disabled={pending}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            disabled={pending || config.extraContacts.length >= 10}
            onClick={() => {
              const row: FooterExtraContact = {
                id: newId("contact"),
                label: "",
                address: "",
                phone: "",
                email: "",
              };
              patch({ extraContacts: [...config.extraContacts, row] });
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add another address
          </button>
        </div>
      </StudioCard>

      <StudioCard title="Footer modules" onUpdate={() => saveConfig()}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["showCtaButtons", "Report / product-request buttons"],
              ["showNewsletter", "Newsletter signup"],
              ["showTrackForm", "Order track form"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <AdminToggleSwitch
                label={label}
                checked={config[key]}
                onChange={(checked) => patch({ [key]: checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </StudioCard>

      <StudioCard title="App links" onUpdate={() => saveConfig()}>
        <label className="flex items-center gap-2 text-sm">
          <AdminToggleSwitch
            label="Enable Play Store link"
            checked={config.playStoreEnabled}
            onChange={(checked) => patch({ playStoreEnabled: checked })}
          />
          Enable Play Store link
        </label>
        <Field label="Play Store URL">
          <Input
            value={config.playStoreUrl}
            onChange={(e) => patch({ playStoreUrl: e.target.value })}
            placeholder="https://"
            className={controlClass}
            disabled={pending}
          />
        </Field>
      </StudioCard>

      <StudioCard title="Copyright & payments" onUpdate={() => saveConfig()}>
        <Field
          label="Copyright text"
          hint="Use {year} and {storeName}. Separate paragraphs with a new line."
        >
          <Textarea
            value={config.copyrightText}
            onChange={(e) => patch({ copyrightText: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            disabled={pending}
          />
        </Field>
        <Field
          label="Payment methods image"
          hint="Shown large in the footer as “We accept” — use a wide strip/grid of icons (about 900–1400px wide)."
        >
          {config.paymentMethodsImageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.paymentMethodsImageSrc}
              alt=""
              className="mb-2 h-16 max-w-full object-contain object-left"
            />
          ) : null}
          <input
            type="file"
            accept="image/*"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              const body = new FormData();
              body.set("file", file);
              startTransition(async () => {
                const uploaded = await uploadFooterPaymentImageAction(body);
                if (!uploaded.ok || !uploaded.path) {
                  notifyError(
                    uploaded.ok
                      ? "Upload failed."
                      : uploaded.formError,
                  );
                  return;
                }
                const next = {
                  ...config,
                  paymentMethodsImageSrc: uploaded.path,
                };
                setConfig(next);
                const saved = await saveFooterWidgetsAction({ config: next });
                if (!saved.ok) {
                  notifyError(saved.formError);
                  return;
                }
                notifySuccess("Payment image saved");
                router.refresh();
              });
            }}
          />
        </Field>
      </StudioCard>

      <StudioCard title="Sub footer band" onUpdate={() => saveConfig()}>
        <label className="flex items-center gap-2 text-sm">
          <AdminToggleSwitch
            label="Enable sub footer"
            checked={config.subFooterEnabled}
            onChange={(checked) => patch({ subFooterEnabled: checked })}
          />
          Enable sub footer
        </label>
        <Field label="Title">
          <Input
            value={config.subFooterTitle}
            onChange={(e) => patch({ subFooterTitle: e.target.value })}
            className={controlClass}
            disabled={pending}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={config.subFooterDescription}
            onChange={(e) => patch({ subFooterDescription: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            disabled={pending}
          />
        </Field>
      </StudioCard>
    </PageShell>
  );
}

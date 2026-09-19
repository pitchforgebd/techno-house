"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { notifyError } from "@/components/ui/feedback-provider";
import {
  AdminToggleSwitch,
  FieldRow,
  Input,
  Select,
  SetupBackLink,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { saveBusinessSettingsAction } from "@/features/admin/settings/business-actions";
import {
  saveInvoiceSettingsAction,
  saveOrderConfigurationAction,
  saveOrderTrackingAction,
  savePickupPointsAction,
  saveShippingLabelAction,
  saveTaxSettingsAction,
  saveThermalPrinterAction,
} from "@/features/admin/settings/operations-actions";
import {
  BUSINESS_TIMEZONES,
  type AdminBusinessSettings,
} from "@/lib/business/fields";
import {
  LABEL_SIZES,
  PICKUP_POINTS,
  THERMAL_PAPER_WIDTHS,
  basisPointsToPercent,
  type AdminStoreOperationsSettings,
} from "@/lib/business/operations-fields";
import type { StoreOperationsMutationResult } from "@/lib/business/operations-config";

/**
 * Shared save wiring for the seven operations sub-pages: runs the real server
 * action, surfaces the real error inline, and re-reads from the server on
 * success so the form shows what was actually persisted.
 */
function useOperationsSave() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  function save(
    run: () => Promise<StoreOperationsMutationResult>,
    successMessage: string,
  ) {
    setFormError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess(successMessage);
      router.refresh();
    });
  }

  return { pending, formError, save };
}

/**
 * Says plainly that a section saves but is not yet read by anything.
 *
 * The audit (F17-01) found the whole Store Operations group was persist-only:
 * every field validated, saved, audit-logged and reloaded, and no other code
 * read any of it. The VAT rate, service charge, order minimum and
 * auto-confirmation have since been wired to the checkout and payment paths.
 * The sections below this notice have not, because wiring them is a product
 * decision rather than a missing function call — there is no pickup flow at
 * checkout to attach a pickup point to, and no print feature for a label size
 * to configure.
 *
 * The notice exists because the failure mode is silent and expensive: a screen
 * that saves successfully is indistinguishable from a screen that works, so an
 * operator sets a value, sees "Saved", and reasonably believes the store now
 * behaves that way. Telling them costs nothing; not telling them means finding
 * out from a customer.
 *
 * Delete this from a section the moment that section's values are actually
 * read somewhere.
 */
function NotAppliedNotice({ what }: { what: string }) {
  return (
    <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <strong className="font-semibold">Saved but not yet applied.</strong>{" "}
      These values are stored and will be kept, but {what} does not read them
      yet, so changing them has no effect on the storefront.
    </p>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p className="mb-3 text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

export function AdminGeneralSettingsForm({
  settings,
}: {
  settings: AdminBusinessSettings;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    storeName: settings.storeName,
    legalName: settings.legalName,
    supportEmail: settings.supportEmail,
    phone: settings.phone,
    address: settings.address,
    city: settings.city,
    timezone: settings.timezone,
    taxId: settings.taxId,
    googleMapsUrl: settings.googleMapsUrl,
  });

  function save() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveBusinessSettingsAction(form);
      if (!result.ok) {
        setFormError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess("General settings saved");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <SetupBackLink />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          General Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Store identity and contact details for invoices and customer comms.
          Currency stays BDT.
        </p>
      </div>

      <SetupCard
        title="Business Information"
        onSave={save}
        saveLabel={pending ? "Saving…" : "Save"}
      >
        {formError ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <FieldRow label="Store name">
          <Input
            className={controlClass}
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
          />
        </FieldRow>
        <FieldRow label="Legal name">
          <Input
            className={controlClass}
            value={form.legalName}
            onChange={(e) => setForm({ ...form, legalName: e.target.value })}
          />
        </FieldRow>
        <FieldRow label="Support email">
          <Input
            type="email"
            className={controlClass}
            value={form.supportEmail}
            onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
          />
        </FieldRow>
        <FieldRow label="Phone">
          <Input
            className={controlClass}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </FieldRow>
        <FieldRow label="Address">
          <Textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className={controlClass}
          />
        </FieldRow>
        <FieldRow label="City">
          <Input
            className={controlClass}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </FieldRow>
        <FieldRow label="Timezone">
          <Select
            className={controlClass}
            value={form.timezone}
            onChange={(e) => {
              const next = BUSINESS_TIMEZONES.find(
                (t) => t.value === e.target.value,
              );
              if (next) {
                setForm({ ...form, timezone: next.value });
              }
            }}
          >
            {BUSINESS_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        </FieldRow>
        <FieldRow label="Tax / BIN ID">
          <Input
            className={controlClass}
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
          />
        </FieldRow>
        <FieldRow
          label="Google Maps link"
          hint="Paste a Google Maps share or embed link. Shown as a location map in the storefront footer, below the contact details. Leave blank to hide it."
        >
          <Input
            className={controlClass}
            value={form.googleMapsUrl}
            onChange={(e) =>
              setForm({ ...form, googleMapsUrl: e.target.value })
            }
            placeholder="https://maps.google.com/..."
          />
        </FieldRow>
      </SetupCard>
    </div>
  );
}

function SubPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <SetupBackLink />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function AdminOrderConfigurationSettings({
  settings,
}: {
  settings: AdminStoreOperationsSettings;
}) {
  const { pending, formError, save } = useOperationsSave();
  const [prefix, setPrefix] = useState(settings.orderCodePrefix);
  const [minAmount, setMinAmount] = useState(
    String(settings.minimumOrderAmount),
  );
  const [autoConfirm, setAutoConfirm] = useState(settings.autoConfirmPaidOrders);

  return (
    <SubPageShell
      title="Order Configuration"
      subtitle="Configure order numbering, minimums and confirmation rules."
    >
      <SetupCard
        title="Order Settings"
        saveLabel={pending ? "Saving…" : "Save"}
        onSave={() =>
          save(
            () =>
              saveOrderConfigurationAction({
                orderCodePrefix: prefix,
                minimumOrderAmount: minAmount,
                autoConfirmPaidOrders: autoConfirm,
              }),
            "Order configuration saved",
          )
        }
      >
        <FormError message={formError} />
        {/* The one field in this section that is still not read. Order numbers
            come from the `order_number_seq` Postgres sequence as bare digits,
            by deliberate design (see `lib/orders/order-number.ts`), so applying
            this prefix would change the format of every future order number
            without anyone asking for that. It is flagged rather than wired. */}
        <FieldRow
          label="Order code prefix"
          hint="Not applied — new order numbers are issued as plain sequential digits."
        >
          <Input
            className={controlClass}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </FieldRow>
        <FieldRow
          label="Minimum order amount (BDT)"
          hint="Enforced at checkout, against the cart value before any coupon. 0 means no minimum."
        >
          <Input
            type="number"
            className={controlClass}
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
        </FieldRow>
        <FieldRow
          label="Auto-confirm paid orders"
          hint="Moves an order to Processing the moment payment is confirmed. Orders already shipped or cancelled are left alone."
        >
          <AdminToggleSwitch
            label="Auto-confirm paid orders"
            checked={autoConfirm}
            onChange={setAutoConfirm}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
      </SetupCard>
    </SubPageShell>
  );
}

export function AdminTaxSettings({
  settings,
}: {
  settings: AdminStoreOperationsSettings;
}) {
  const { pending, formError, save } = useOperationsSave();
  const [vatRate, setVatRate] = useState(
    basisPointsToPercent(settings.vatRateBasisPoints),
  );
  const [serviceCharge, setServiceCharge] = useState(
    String(settings.serviceChargeAmount),
  );
  const [taxIncluded, setTaxIncluded] = useState(settings.taxIncludedInPrice);

  return (
    <SubPageShell
      title="Vat, TAX & Other Charges"
      subtitle="Configure tax rates and additional order charges."
    >
      <SetupCard
        title="Tax & Charges"
        saveLabel={pending ? "Saving…" : "Save"}
        onSave={() =>
          save(
            () =>
              saveTaxSettingsAction({
                vatRatePercent: vatRate,
                serviceChargeAmount: serviceCharge,
                taxIncludedInPrice: taxIncluded,
              }),
            "Tax settings saved",
          )
        }
      >
        <FormError message={formError} />
        <FieldRow label="VAT rate (%)">
          <Input
            type="number"
            className={controlClass}
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
          />
        </FieldRow>
        <FieldRow
          label="Service charge (BDT)"
          hint="A flat amount added to every order total, shown as its own line on the invoice. 0 means none."
        >
          <Input
            type="number"
            className={controlClass}
            value={serviceCharge}
            onChange={(e) => setServiceCharge(e.target.value)}
          />
        </FieldRow>
        <FieldRow
          label="Tax included in product price"
          hint="On: displayed prices already contain VAT, so it is recorded for the invoice but not added again. Off: VAT is added on top at checkout."
        >
          <AdminToggleSwitch
            label="Tax included in product price"
            checked={taxIncluded}
            onChange={setTaxIncluded}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
      </SetupCard>
    </SubPageShell>
  );
}

export function AdminPickupPointsSettings({
  settings,
}: {
  settings: AdminStoreOperationsSettings;
}) {
  const { pending, formError, save } = useOperationsSave();
  const [enabled, setEnabled] = useState(settings.pickupEnabled);
  const [defaultPoint, setDefaultPoint] = useState(settings.defaultPickupPoint);

  return (
    <SubPageShell
      title="Pickup Points"
      subtitle="Enable in-store pickup and manage default location."
    >
      <SetupCard
        title="Pickup Configuration"
        saveLabel={pending ? "Saving…" : "Save"}
        onSave={() =>
          save(
            () =>
              savePickupPointsAction({
                pickupEnabled: enabled,
                defaultPickupPoint: defaultPoint,
              }),
            "Pickup points saved",
          )
        }
      >
        <FormError message={formError} />
        <NotAppliedNotice what="checkout" />
        <FieldRow label="Enable pickup points">
          <AdminToggleSwitch
            label="Enable pickup points"
            checked={enabled}
            onChange={setEnabled}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
        <FieldRow label="Default pickup point">
          <Select
            className={controlClass}
            value={defaultPoint}
            onChange={(e) => setDefaultPoint(e.target.value)}
          >
            {PICKUP_POINTS.map((point) => (
              <option key={point.value} value={point.value}>
                {point.label}
              </option>
            ))}
          </Select>
        </FieldRow>
      </SetupCard>
    </SubPageShell>
  );
}

export function AdminInvoiceSettings({
  settings,
}: {
  settings: AdminStoreOperationsSettings;
}) {
  const { pending, formError, save } = useOperationsSave();
  const [prefix, setPrefix] = useState(settings.invoicePrefix);
  const [footer, setFooter] = useState(settings.invoiceFooter);

  return (
    <SubPageShell
      title="Invoice Settings"
      subtitle="Invoice numbering, footer text and print defaults."
    >
      <SetupCard
        title="Invoice Configuration"
        saveLabel={pending ? "Saving…" : "Save"}
        onSave={() =>
          save(
            () =>
              saveInvoiceSettingsAction({
                invoicePrefix: prefix,
                invoiceFooter: footer,
              }),
            "Invoice settings saved",
          )
        }
      >
        <FormError message={formError} />
        <NotAppliedNotice what="the printable invoice" />
        <FieldRow label="Invoice prefix">
          <Input
            className={controlClass}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Invoice footer">
          <Textarea
            className={controlClass}
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            rows={3}
          />
        </FieldRow>
      </SetupCard>
    </SubPageShell>
  );
}

export function AdminOrderTrackingSettings({
  settings,
}: {
  settings: AdminStoreOperationsSettings;
}) {
  const { pending, formError, save } = useOperationsSave();
  const [trackingUrl, setTrackingUrl] = useState(settings.trackingUrlTemplate);
  const [notifyCustomer, setNotifyCustomer] = useState(
    settings.notifyOnStatusChange,
  );

  return (
    <SubPageShell
      title="Order Tracking"
      subtitle="Tracking URL template and customer notifications."
    >
      <SetupCard
        title="Tracking Configuration"
        saveLabel={pending ? "Saving…" : "Save"}
        onSave={() =>
          save(
            () =>
              saveOrderTrackingAction({
                trackingUrlTemplate: trackingUrl,
                notifyOnStatusChange: notifyCustomer,
              }),
            "Order tracking saved",
          )
        }
      >
        <FormError message={formError} />
        <NotAppliedNotice what="the order tracking and courier flow" />
        <FieldRow label="Tracking URL template">
          <Input
            className={controlClass}
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Notify customer on status change">
          <AdminToggleSwitch
            label="Notify customer on status change"
            checked={notifyCustomer}
            onChange={setNotifyCustomer}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
      </SetupCard>
    </SubPageShell>
  );
}

export function AdminShippingLabelSettings({
  settings,
}: {
  settings: AdminStoreOperationsSettings;
}) {
  const { pending, formError, save } = useOperationsSave();
  const [labelSize, setLabelSize] = useState(settings.labelSize);
  const [showLogo, setShowLogo] = useState(settings.labelShowLogo);

  return (
    <SubPageShell
      title="Shipping Label"
      subtitle="Label dimensions and print layout defaults."
    >
      <SetupCard
        title="Label Settings"
        saveLabel={pending ? "Saving…" : "Save"}
        onSave={() =>
          save(
            () =>
              saveShippingLabelAction({
                labelSize,
                labelShowLogo: showLogo,
              }),
            "Shipping label settings saved",
          )
        }
      >
        <FormError message={formError} />
        <NotAppliedNotice what="any shipping-label output" />
        <FieldRow label="Label size">
          <Select
            className={controlClass}
            value={labelSize}
            onChange={(e) => setLabelSize(e.target.value)}
          >
            {LABEL_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </Select>
        </FieldRow>
        <FieldRow label="Show store logo on label">
          <AdminToggleSwitch
            label="Show store logo on label"
            checked={showLogo}
            onChange={setShowLogo}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
      </SetupCard>
    </SubPageShell>
  );
}

export function AdminThermalPrinterSettings({
  settings,
}: {
  settings: AdminStoreOperationsSettings;
}) {
  const { pending, formError, save } = useOperationsSave();
  const [enabled, setEnabled] = useState(settings.thermalPrinterEnabled);
  const [paperWidth, setPaperWidth] = useState(
    String(settings.thermalPaperWidthMm),
  );

  return (
    <SubPageShell
      title="Thermal Printer Settings"
      subtitle="Receipt printer connection and paper width."
    >
      <SetupCard
        title="Printer Configuration"
        saveLabel={pending ? "Saving…" : "Save"}
        onSave={() =>
          save(
            () =>
              saveThermalPrinterAction({
                thermalPrinterEnabled: enabled,
                thermalPaperWidthMm: paperWidth,
              }),
            "Thermal printer settings saved",
          )
        }
      >
        <FormError message={formError} />
        <NotAppliedNotice what="the print path" />
        <FieldRow label="Enable thermal printer">
          <AdminToggleSwitch
            label="Enable thermal printer"
            checked={enabled}
            onChange={setEnabled}
            activeClassName="bg-emerald-500"
          />
        </FieldRow>
        <FieldRow label="Paper width (mm)">
          <Select
            className={controlClass}
            value={paperWidth}
            onChange={(e) => setPaperWidth(e.target.value)}
          >
            {THERMAL_PAPER_WIDTHS.map((width) => (
              <option key={width} value={String(width)}>
                {width} mm
              </option>
            ))}
          </Select>
        </FieldRow>
      </SetupCard>
    </SubPageShell>
  );
}

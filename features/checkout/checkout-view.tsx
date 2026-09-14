"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Lock,
  MapPin,
  Smartphone,
  Truck,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { loadCartProducts } from "@/features/cart/actions";
import { loadCartWeights } from "@/features/checkout/weight-actions";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useCheckoutContact } from "@/features/checkout/use-checkout-contact";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import type { ProductSummary } from "@/lib/data";
import { placeOrderAction } from "@/features/checkout/checkout-actions";
import { loginHref, registerHref } from "@/lib/account/return-path";
import { computeOrderTax } from "@/lib/business/tax";
import { computeServiceCharge } from "@/lib/business/service-charge";
import { belowMinimumOrder } from "@/lib/business/minimum-order";
import type { PublicOrderCharges } from "@/lib/business/operations-config";
import { cartItemCount, cartLineKey } from "@/lib/cart/cart";
import { validateCheckoutContact } from "@/lib/cart/checkout";
import { applyCouponToSubtotal } from "@/lib/cart/coupons";
import {
  MOCK_PAYMENT_METHODS,
  findPaymentMethod,
  type PaymentMethodId,
} from "@/lib/cart/payment";
import { isAllowedPaymentRedirect } from "@/lib/payments/redirect";
import {
  MOCK_SHIPPING_AREAS,
  MOCK_SHIPPING_METHODS,
  MOCK_SHIPPING_ZONES,
  calculateZoneShippingAmount,
  findShippingArea,
  findShippingMethod,
  methodsForZone,
  resolveShippingRate,
  type ShippingArea,
  type ShippingMethod,
  type ShippingZone,
  type ShippingZoneId,
} from "@/lib/cart/shipping";
import { formatMoney } from "@/lib/format/currency";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { cn } from "@/lib/cn";

function SectionCard({
  step,
  title,
  icon,
  children,
}: {
  step: number;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-caption font-semibold text-primary-foreground">
          {step}
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-primary" aria-hidden>
            {icon}
          </span>
          <h2 className="text-base font-semibold tracking-tight text-text">
            {title}
          </h2>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ChoiceCard({
  name,
  value,
  checked,
  disabled,
  title,
  description,
  trailing,
  icon,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  title: string;
  description?: string;
  trailing?: string;
  icon?: ReactNode;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3.5 transition-colors",
        checked
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border bg-surface hover:border-primary/40",
        disabled && "cursor-not-allowed opacity-50 hover:border-border",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      {icon ? (
        <span
          className={cn(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md",
            checked ? "bg-primary/10 text-primary" : "bg-surface-muted text-text-muted",
          )}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-label font-semibold text-text">{title}</span>
          {trailing ? (
            <span className="tabular-nums text-label font-medium text-text">
              {trailing}
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="mt-0.5 block text-caption text-text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function paymentIcon(id: PaymentMethodId) {
  if (id === "cod") {
    return <Banknote className="size-4" />;
  }
  if (id === "bkash" || id === "nagad") {
    return <Smartphone className="size-4" />;
  }
  return <CreditCard className="size-4" />;
}

export function CheckoutView({
  shippingMethods = MOCK_SHIPPING_METHODS,
  shippingZones = MOCK_SHIPPING_ZONES,
  shippingAreas = MOCK_SHIPPING_AREAS,
  districts = [],
  upazilas = [],
  gateways = { sslcommerz: false, bkash: false, nagad: false },
  offline = {
    codEnabled: true,
    label: "Cash on delivery",
    instructions: "Pay in cash when the order arrives.",
  },
  billingAddressEnabled = false,
  couponsEnabled = true,
  charges = {
    vatRateBasisPoints: 0,
    taxIncludedInPrice: true,
    serviceChargeAmount: 0,
    minimumOrderAmount: 0,
  },
}: {
  shippingMethods?: ShippingMethod[];
  shippingZones?: ShippingZone[];
  shippingAreas?: ShippingArea[];
  districts?: { id: string; name: string }[];
  upazilas?: {
    id: string;
    name: string;
    districtId: string;
    shippingAreaId: string | null;
  }[];
  gateways?: { sslcommerz: boolean; bkash: boolean; nagad: boolean };
  offline?: { codEnabled: boolean; label: string; instructions: string };
  billingAddressEnabled?: boolean;
  couponsEnabled?: boolean;
  /**
   * VAT, service charge and order minimum, from Admin -> Settings. The
   * defaults above are the same as the database defaults, so a mock render or
   * a Storybook-style call behaves exactly as this page did before these
   * settings were wired.
   */
  charges?: PublicOrderCharges;
}) {
  const router = useRouter();
  const session = useCustomerSession();
  const { state, setShipping, setPaymentMethod, clearCart } = useCartStore();
  const { contact, patchContact } = useCheckoutContact();
  const [contactErrors, setContactErrors] = useState<
    Partial<Record<keyof typeof contact, string>>
  >({});
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [weightsBySlug, setWeightsBySlug] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState<string | null>(null);
  const [showBillingAddress, setShowBillingAddress] = useState(
    () => contact.billingAddress.trim().length > 0,
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    () =>
      upazilas.find((u) => u.shippingAreaId === state.shippingAreaId)
        ?.districtId ?? null,
  );
  const districtUpazilas = selectedDistrictId
    ? upazilas.filter((u) => u.districtId === selectedDistrictId)
    : [];

  const slugs = useMemo(
    () => state.lines.map((line) => line.slug),
    [state.lines],
  );

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const items = await loadCartProducts(slugs);
      if (!cancelled) {
        setProducts(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  useEffect(() => {
    let cancelled = false;
    loadCartWeights(slugs).then((weights) => {
      if (!cancelled) {
        setWeightsBySlug(weights);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const patch: Partial<typeof contact> = {};
    if (!contact.fullName.trim() && session.fullName) {
      patch.fullName = session.fullName;
    }
    if (!contact.email.trim() && session.email) {
      patch.email = session.email;
    }
    if (!contact.phone.trim() && session.phone) {
      patch.phone = session.phone;
    }
    if (Object.keys(patch).length > 0) {
      patchContact(patch);
    }
    // Prefill once when session appears; ignore further contact edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot prefill
  }, [session?.userId]);

  useEffect(() => {
    const id = state.paymentMethodId;
    if (id === "sslcommerz" && !gateways.sslcommerz) {
      setPaymentMethod("cod");
    } else if (id === "bkash" && !gateways.bkash) {
      setPaymentMethod("cod");
    } else if (id === "nagad" && !gateways.nagad) {
      setPaymentMethod("cod");
    }
  }, [
    gateways.bkash,
    gateways.nagad,
    gateways.sslcommerz,
    setPaymentMethod,
    state.paymentMethodId,
  ]);

  const productBySlug = useMemo(() => {
    const map = new Map<string, ProductSummary>();
    for (const product of products) {
      map.set(product.slug, product);
    }
    return map;
  }, [products]);

  const rows = state.lines
    .map((line) => {
      const product = productBySlug.get(line.slug);
      if (!product) {
        return null;
      }
      return {
        line,
        product,
        lineTotal: product.price.amount * line.quantity,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const subtotal = rows.reduce((sum, row) => sum + row.lineTotal, 0);
  const itemCount = cartItemCount(state);
  const couponResult =
    couponsEnabled && state.couponCode
      ? applyCouponToSubtotal(state.couponCode, subtotal, state.appliedCoupon)
      : null;
  const discountAmount =
    couponResult?.ok === true ? couponResult.discountAmount : 0;
  const totalWeightGrams = rows.reduce(
    (sum, row) => sum + (weightsBySlug[row.line.slug] ?? 500) * row.line.quantity,
    0,
  );
  const shippingResult = resolveShippingRate(
    state.shippingMethodId,
    state.shippingAreaId,
    shippingMethods,
    shippingAreas,
    totalWeightGrams,
  );
  const shippingAmount = shippingResult.ok ? shippingResult.amount : 0;
  // Derived with the same pure functions the server charges with, so this
  // summary cannot drift from `lib/orders/create-order.ts`. Before these were
  // wired the total here was `subtotal - discount + shipping`, which stopped
  // being the charged figure the moment an operator set an exclusive VAT rate.
  const tax = computeOrderTax({
    taxableBase: Math.max(0, subtotal - discountAmount),
    vatRateBasisPoints: charges.vatRateBasisPoints,
    taxIncludedInPrice: charges.taxIncludedInPrice,
  });
  const serviceChargeAmount = computeServiceCharge(charges.serviceChargeAmount);
  const displayTotal = Math.max(
    0,
    subtotal -
      discountAmount +
      shippingAmount +
      serviceChargeAmount +
      tax.addedToTotal,
  );
  // Told here, before the customer fills anything in, rather than only at the
  // final server refusal.
  const minimum = belowMinimumOrder({
    subtotalAmount: subtotal,
    minimumOrderAmount: charges.minimumOrderAmount,
  });
  const paymentMethod = findPaymentMethod(state.paymentMethodId);

  const area = findShippingArea(state.shippingAreaId, shippingAreas);
  const zoneId = (area?.zoneId ?? null) as ShippingZoneId | null;
  const methods = methodsForZone(zoneId, shippingMethods);
  const selectedMethod = findShippingMethod(
    state.shippingMethodId,
    shippingMethods,
  );
  const pickup =
    shippingMethods.find((method) => method.isPickup) ??
    shippingMethods[0] ??
    null;

  async function placeOrder() {
    if (
      state.lines.length === 0 ||
      !shippingResult.ok ||
      !paymentMethod ||
      Object.keys(validateCheckoutContact(contact)).length > 0
    ) {
      return;
    }
    setPlaceError(null);
    setPlacing(true);

    // Always the real server action. There used to be a `DATA_SOURCE=mock`
    // branch below that fabricated a `TH-<base36>` id client-side, which was a
    // second order-number generator sitting in the checkout path. `Order.number`
    // is now the single source of the customer-facing Order ID, so mock mode
    // gets `placeCustomerOrder`'s own refusal ("Orders need the database…")
    // rather than an invented reference.
    {
      const result = await placeOrderAction({
        contact: { ...contact, notes: "" },
        paymentMethodId: state.paymentMethodId,
      });
      if (!result.ok) {
        setPlacing(false);
        setPlaceError(result.reason);
        notifyError({
          title: "Could not place order",
          description: result.reason,
        });
        return;
      }
      await clearCart();
      if (result.redirectUrl && isAllowedPaymentRedirect(result.redirectUrl)) {
        const gatewayName =
          state.paymentMethodId === "bkash"
            ? "bKash"
            : state.paymentMethodId === "sslcommerz"
              ? "SSLCommerz"
              : state.paymentMethodId === "nagad"
                ? "Nagad"
                : "payment";
        notifySuccess({
          title: `Opening ${gatewayName}`,
          description: `${result.order.number} — complete payment on the next page.`,
        });
        window.location.assign(result.redirectUrl);
        return;
      }
      if (result.paymentStartError) {
        setPlacing(false);
        setPlaceError(result.paymentStartError);
        notifyError({
          title: "Order saved — payment page did not open",
          description: result.paymentStartError,
        });
        router.push(
          `/checkout/confirmation?order=${encodeURIComponent(result.order.number)}`,
        );
        return;
      }
      notifySuccess({
        title: "Order placed",
        description: `${result.order.number} · ${formatMoney({ amount: result.order.totalAmount })}`,
      });
      router.push(
        `/checkout/confirmation?order=${encodeURIComponent(result.order.number)}`,
      );
      return;
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateCheckoutContact(contact);
    setContactErrors(errors);
    if (!agreed) {
      setAgreeError("Please agree to the terms to continue.");
    } else {
      setAgreeError(null);
    }
    if (Object.keys(errors).length > 0 || !agreed) {
      return;
    }
    // The server refuses this too — that is the authoritative check. Repeating
    // it here only saves the customer from filling in an address and choosing a
    // payment method before being told.
    if (!minimum.ok) {
      setPlaceError(minimum.reason);
      return;
    }
    if (!shippingResult.ok) {
      setPlaceError("Select a district, city, and delivery method.");
      return;
    }
    if (!paymentMethod) {
      setPlaceError("Select a payment method.");
      return;
    }
    void placeOrder();
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-content px-4 py-10">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/cart", label: "Cart" },
            { label: "Checkout" },
          ]}
        />
        <EmptyState
          className="mt-8"
          title="Sign in to checkout"
          description="Checkout requires a customer account."
          action={
            <span className="flex flex-wrap justify-center gap-2">
              <Link
                href={loginHref("/checkout")}
                className={buttonClassName({ size: "sm" })}
              >
                Sign in
              </Link>
              <Link
                href={registerHref("/checkout")}
                className={buttonClassName({
                  size: "sm",
                  variant: "secondary",
                })}
              >
                Create account
              </Link>
            </span>
          }
        />
      </div>
    );
  }

  if (state.lines.length === 0 && !placing) {
    return (
      <div className="mx-auto max-w-content px-4 py-10">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/cart", label: "Cart" },
            { label: "Checkout" },
          ]}
        />
        <EmptyState
          className="mt-8"
          title="Your cart is empty"
          description="Add products before starting checkout."
          action={
            <Link href="/shop" className={buttonClassName({ size: "sm" })}>
              Browse shop
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 bg-[linear-gradient(180deg,var(--color-surface-muted)_0%,var(--color-background)_28%)]">
      <div className="mx-auto max-w-content px-4 py-8 md:py-10">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/cart", label: "Cart" },
            { label: "Checkout" },
          ]}
        />

        <header className="mt-5 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Checkout
          </h1>
          <p className="mt-2 text-body text-text-muted">
            Confirm delivery and payment to place your order securely.
          </p>
        </header>

        <form
          className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,22.5rem)] lg:items-start"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="space-y-6">
            <SectionCard
              step={1}
              title="Delivery"
              icon={<Truck className="size-4" />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="District" htmlFor="checkout-district">
                  <Select
                    id="checkout-district"
                    value={selectedDistrictId ?? ""}
                    onChange={(event) => {
                      const nextDistrictId = event.target.value || null;
                      setSelectedDistrictId(nextDistrictId);
                      setShipping({
                        methodId: pickup?.id ?? null,
                        areaId: null,
                      });
                    }}
                  >
                    <option value="">Select district</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Upazila" htmlFor="checkout-upazila">
                  <Select
                    id="checkout-upazila"
                    value={state.shippingAreaId ?? ""}
                    disabled={!selectedDistrictId}
                    onChange={(event) => {
                      const nextAreaId = event.target.value || null;
                      const nextArea = findShippingArea(
                        nextAreaId,
                        shippingAreas,
                      );
                      const available = methodsForZone(
                        nextArea?.zoneId ?? null,
                        shippingMethods,
                      );
                      const keep =
                        selectedMethod &&
                        available.some(
                          (method) => method.id === selectedMethod.id,
                        )
                          ? selectedMethod.id
                          : (available.find((method) => !method.isPickup)
                              ?.id ??
                            available[0]?.id ??
                            null);
                      setShipping({ methodId: keep, areaId: nextAreaId });
                    }}
                  >
                    <option value="">Select upazila</option>
                    {districtUpazilas.map((upazila) => (
                      <option
                        key={upazila.id}
                        value={upazila.shippingAreaId ?? ""}
                      >
                        {upazila.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-label font-medium text-text">
                  Delivery method
                </legend>
                <div className="space-y-2">
                  {methods.length === 0 ? (
                    <p className="text-caption text-text-muted">
                      Select a district to see delivery options.
                    </p>
                  ) : (
                    methods.map((method) => {
                      const rateLabel = method.isPickup
                        ? "Free"
                        : area
                          ? formatMoney({
                              amount: calculateZoneShippingAmount(
                                area,
                                totalWeightGrams,
                              ),
                            })
                          : "Depends on upazila";
                      return (
                        <ChoiceCard
                          key={method.id}
                          name="checkout-shipping-method"
                          value={method.id}
                          checked={state.shippingMethodId === method.id}
                          disabled={
                            !method.isPickup &&
                            (!zoneId ||
                              (method.zoneIds.length > 0 &&
                                !method.zoneIds.includes(zoneId)))
                          }
                          title={method.name}
                          description={method.description}
                          trailing={rateLabel}
                          icon={<Truck className="size-4" />}
                          onChange={() => {
                            setShipping({
                              methodId: method.id,
                              areaId: state.shippingAreaId,
                            });
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </fieldset>

              <div className="border-t border-border pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="size-4 text-primary" aria-hidden />
                  <h3 className="text-label font-semibold text-text">
                    Customer information
                  </h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Full name"
                    htmlFor="checkout-name"
                    error={contactErrors.fullName}
                  >
                    <Input
                      id="checkout-name"
                      value={contact.fullName}
                      autoComplete="name"
                      onChange={(event) =>
                        patchContact({ fullName: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Mobile number"
                    htmlFor="checkout-phone"
                    error={contactErrors.phone}
                  >
                    <Input
                      id="checkout-phone"
                      type="tel"
                      value={contact.phone}
                      autoComplete="tel"
                      onChange={(event) =>
                        patchContact({ phone: event.target.value })
                      }
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field
                      label="Email"
                      htmlFor="checkout-email"
                      error={contactErrors.email}
                    >
                      <Input
                        id="checkout-email"
                        type="email"
                        value={contact.email}
                        autoComplete="email"
                        onChange={(event) =>
                          patchContact({ email: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Delivery address"
                      htmlFor="checkout-address"
                      error={contactErrors.addressLine}
                    >
                      <Textarea
                        id="checkout-address"
                        value={contact.addressLine}
                        autoComplete="street-address"
                        rows={3}
                        onChange={(event) =>
                          patchContact({ addressLine: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                  {billingAddressEnabled ? (
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 text-body text-text">
                        <input
                          type="checkbox"
                          checked={showBillingAddress}
                          onChange={(event) => {
                            setShowBillingAddress(event.target.checked);
                            if (!event.target.checked) {
                              patchContact({ billingAddress: "" });
                            }
                          }}
                          className="size-4 rounded border-border"
                        />
                        Use a different billing address
                      </label>
                      {showBillingAddress ? (
                        <div className="mt-2">
                          <Field
                            label="Billing address"
                            htmlFor="checkout-billing-address"
                          >
                            <Textarea
                              id="checkout-billing-address"
                              value={contact.billingAddress}
                              autoComplete="billing street-address"
                              rows={3}
                              onChange={(event) =>
                                patchContact({
                                  billingAddress: event.target.value,
                                })
                              }
                            />
                          </Field>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              step={2}
              title="Payment"
              icon={<CreditCard className="size-4" />}
            >
              <fieldset className="space-y-2">
                <legend className="sr-only">Payment method</legend>
                <div className="space-y-2">
                  {MOCK_PAYMENT_METHODS.map((method) => {
                    const configured =
                      method.id === "cod"
                        ? offline.codEnabled
                        : method.id === "sslcommerz"
                          ? gateways.sslcommerz
                          : method.id === "bkash"
                            ? gateways.bkash
                            : gateways.nagad;
                    const title =
                      method.id === "cod" ? offline.label : method.name;
                    const description = !configured
                      ? "Temporarily unavailable."
                      : method.id === "cod"
                        ? offline.instructions
                        : method.description;
                    return (
                      <ChoiceCard
                        key={method.id}
                        name="checkout-payment-method"
                        value={method.id}
                        checked={state.paymentMethodId === method.id}
                        disabled={!configured}
                        title={title}
                        description={description}
                        icon={paymentIcon(method.id)}
                        onChange={() => setPaymentMethod(method.id)}
                      />
                    );
                  })}
                </div>
              </fieldset>
              {paymentMethod && paymentMethod.id !== "cod" ? (
                <p className="flex items-start gap-2 rounded-lg bg-surface-muted/80 px-3.5 py-2.5 text-caption text-text-muted">
                  <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                  You will complete payment securely on the{" "}
                  {paymentMethod.id === "bkash"
                    ? "bKash"
                    : paymentMethod.id === "nagad"
                      ? "Nagad"
                      : "SSLCommerz"}{" "}
                  page after placing the order.
                </p>
              ) : null}
            </SectionCard>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
              <div className="border-b border-border bg-primary px-5 py-3.5">
                <h2 className="text-label font-semibold tracking-tight text-primary-foreground">
                  Order summary
                </h2>
                <p className="mt-0.5 text-caption text-primary-foreground/80">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
              </div>

              <div className="max-h-48 space-y-3 overflow-y-auto border-b border-border px-5 py-4">
                {pending && rows.length === 0 ? (
                  <p className="text-caption text-text-muted">Loading…</p>
                ) : (
                  rows.map(({ line, product, lineTotal }) => (
                    <div
                      key={cartLineKey(line)}
                      className="flex items-start justify-between gap-3 text-caption"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">
                          {product.name}
                        </p>
                        {line.colorName ? (
                          <p className="text-text-muted">
                            Colour: {line.colorName}
                          </p>
                        ) : null}
                        <p className="text-text-muted">Qty {line.quantity}</p>
                      </div>
                      <p className="shrink-0 tabular-nums font-medium text-text">
                        {formatMoney({ amount: lineTotal })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2.5 px-5 py-4 text-body">
                <p className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-text">
                    {formatMoney({ amount: subtotal })}
                  </span>
                </p>
                <p className="flex justify-between text-text-muted">
                  <span>Discount</span>
                  <span className="tabular-nums text-text">
                    {discountAmount > 0
                      ? `−${formatMoney({ amount: discountAmount })}`
                      : formatMoney({ amount: 0 })}
                  </span>
                </p>
                <p className="flex justify-between text-text-muted">
                  <span>Delivery</span>
                  <span className="tabular-nums text-text">
                    {shippingResult.ok
                      ? shippingAmount === 0
                        ? "Free"
                        : formatMoney({ amount: shippingAmount })
                      : "—"}
                  </span>
                </p>
                {serviceChargeAmount > 0 ? (
                  <p className="flex justify-between text-text-muted">
                    <span>Service charge</span>
                    <span className="tabular-nums text-text">
                      {formatMoney({ amount: serviceChargeAmount })}
                    </span>
                  </p>
                ) : null}
                {tax.addedToTotal > 0 ? (
                  <p className="flex justify-between text-text-muted">
                    <span>VAT</span>
                    <span className="tabular-nums text-text">
                      {formatMoney({ amount: tax.addedToTotal })}
                    </span>
                  </p>
                ) : null}
                <p className="flex justify-between border-t border-border pt-3 text-base font-semibold text-text">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatMoney({ amount: displayTotal })}
                  </span>
                </p>
              </div>

              <div className="space-y-3 border-t border-border px-5 py-4">
                <Checkbox
                  id="checkout-agree"
                  label={
                    <>
                      I agree to the{" "}
                      <Link
                        href="/returns"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Return & Refund
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/terms"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Terms
                      </Link>
                      .
                    </>
                  }
                  checked={agreed}
                  onChange={(event) => {
                    setAgreed(event.target.checked);
                    if (event.target.checked) {
                      setAgreeError(null);
                    }
                  }}
                />
                {agreeError ? (
                  <p className="text-caption text-danger" role="alert">
                    {agreeError}
                  </p>
                ) : null}
                {placeError ? (
                  <p className="text-caption text-danger" role="alert">
                    {placeError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className={buttonClassName({
                    className: "w-full",
                  })}
                  disabled={
                    placing || pending || rows.length === 0 || !minimum.ok
                  }
                >
                  {placing ? "Placing order…" : "Place order"}
                </button>
                {!minimum.ok ? (
                  <p className="text-caption text-text-muted">
                    {minimum.reason}
                  </p>
                ) : null}
                <Link
                  href="/cart"
                  className={buttonClassName({
                    variant: "ghost",
                    className: "w-full border border-border",
                  })}
                >
                  Back to cart
                </Link>
                <p className="flex items-center justify-center gap-1.5 text-center text-caption text-text-muted">
                  <Lock className="size-3.5" aria-hidden />
                  Secure checkout
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

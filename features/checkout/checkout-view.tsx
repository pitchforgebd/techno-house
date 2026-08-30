"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loadCartProducts } from "@/features/cart/actions";
import { CartPaymentForm } from "@/features/cart/cart-payment-form";
import { CartShippingForm } from "@/features/cart/cart-shipping-form";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useCheckoutContact } from "@/features/checkout/use-checkout-contact";
import { useMockCustomer } from "@/features/account/use-mock-customer";
import type { ProductSummary } from "@/lib/data";
import { persistMockOrder } from "@/lib/account/mock-orders";
import { loginHref, registerHref } from "@/lib/account/return-path";
import { cartItemCount } from "@/lib/cart/cart";
import {
  CHECKOUT_STEPS,
  LAST_ORDER_KEY,
  createMockOrderId,
  validateCheckoutContact,
  type CheckoutStepId,
  type MockOrderSnapshot,
} from "@/lib/cart/checkout";
import { applyCouponToSubtotal } from "@/lib/cart/coupons";
import { findPaymentMethod } from "@/lib/cart/payment";
import { resolveShippingRate } from "@/lib/cart/shipping";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";
import { notifySuccess } from "@/components/ui/feedback-provider";

export function CheckoutView() {
  const router = useRouter();
  const { session } = useMockCustomer();
  const { state, clearCart } = useCartStore();
  const { contact, patchContact } = useCheckoutContact();
  const [step, setStep] = useState<CheckoutStepId>("contact");
  const [contactErrors, setContactErrors] = useState<
    Partial<Record<keyof typeof contact, string>>
  >({});
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();
  const [placing, setPlacing] = useState(false);

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
  const couponResult = state.couponCode
    ? applyCouponToSubtotal(state.couponCode, subtotal)
    : null;
  const discountAmount =
    couponResult?.ok === true ? couponResult.discountAmount : 0;
  const shippingResult = resolveShippingRate(
    state.shippingMethodId,
    state.shippingAreaId,
  );
  const shippingAmount = shippingResult.ok ? shippingResult.amount : 0;
  const displayTotal = Math.max(0, subtotal - discountAmount + shippingAmount);
  const paymentMethod = findPaymentMethod(state.paymentMethodId);

  const stepIndex = CHECKOUT_STEPS.findIndex((item) => item.id === step);

  function goNextFromContact(event: FormEvent) {
    event.preventDefault();
    const errors = validateCheckoutContact(contact);
    setContactErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setStep("delivery");
  }

  function placeMockOrder() {
    if (
      state.lines.length === 0 ||
      !shippingResult.ok ||
      !paymentMethod ||
      Object.keys(validateCheckoutContact(contact)).length > 0
    ) {
      return;
    }
    setPlacing(true);
    const snapshot: MockOrderSnapshot = {
      orderId: createMockOrderId(),
      createdAt: new Date().toISOString(),
      fullName: contact.fullName.trim(),
      phone: contact.phone.trim(),
      email: contact.email.trim(),
      addressLine: contact.addressLine.trim(),
      notes: contact.notes.trim(),
      shippingMethodId: state.shippingMethodId,
      shippingAreaId: state.shippingAreaId,
      paymentMethodId: state.paymentMethodId,
      couponCode: state.couponCode,
      itemCount,
      subtotal,
      discountAmount,
      shippingAmount,
      total: displayTotal,
      lineSummaries: rows.map(({ line, product, lineTotal }) => ({
        slug: line.slug,
        name: product.name,
        quantity: line.quantity,
        lineTotal,
      })),
    };
    window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(snapshot));
    persistMockOrder(snapshot);
    clearCart();
    notifySuccess({
      title: "Order placed",
      description: `${snapshot.orderId} · ${formatMoney({ amount: snapshot.total })} — mock only, nothing is charged.`,
    });
    router.push("/checkout/confirmation");
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-content px-4 py-8">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/cart", label: "Cart" },
            { label: "Checkout" },
          ]}
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Checkout</h1>
        <EmptyState
          className="mt-6"
          title="Sign in to checkout"
          description="Checkout requires a customer account. Guest checkout is not available. Mock sign-in only — nothing is authenticated on a server."
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
      <div className="mx-auto max-w-content px-4 py-8">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/cart", label: "Cart" },
            { label: "Checkout" },
          ]}
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Checkout</h1>
        <EmptyState
          className="mt-6"
          title="Your cart is empty"
          description="Add products before starting checkout. Nothing is charged in this mock flow."
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
    <div className="mx-auto max-w-content px-4 py-8 md:py-10">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/cart", label: "Cart" },
          { label: "Checkout" },
        ]}
      />
      <header className="mt-5 border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Checkout
        </h1>
        <p className="mt-2 text-body text-text-muted">
          Signed in as{" "}
          <span className="font-medium text-text">{session.fullName}</span>
          {" · "}
          mock flow — nothing is charged.
        </p>
      </header>

      <Alert tone="info" title="Account checkout" className="mt-5">
        <p className="text-caption">
          Guest checkout is not available. This is a mock session on this device
          only.
        </p>
      </Alert>

      <ol
        className="mt-6 grid gap-2 sm:grid-cols-4"
        aria-label="Checkout steps"
      >
        {CHECKOUT_STEPS.map((item, index) => {
          const active = item.id === step;
          const done = index < stepIndex;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full min-h-12 items-center gap-2 border px-3 text-left text-label font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-surface text-text-muted",
                )}
                onClick={() => {
                  if (index <= stepIndex || done) {
                    setStep(item.id);
                  }
                }}
                disabled={index > stepIndex}
              >
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold",
                    active
                      ? "bg-primary-foreground text-primary"
                      : done
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-muted text-text-muted",
                  )}
                >
                  {index + 1}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 border border-border bg-surface p-5 sm:p-6">
          {step === "contact" ? (
            <form className="space-y-4" onSubmit={goNextFromContact} noValidate>
              <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
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
                label="Mobile"
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
              <Field
                label="Address / pickup note"
                htmlFor="checkout-address"
                error={contactErrors.addressLine}
                hint="Used with the shipping method you choose next."
              >
                <Textarea
                  id="checkout-address"
                  value={contact.addressLine}
                  autoComplete="street-address"
                  onChange={(event) =>
                    patchContact({ addressLine: event.target.value })
                  }
                />
              </Field>
              <Field label="Order notes (optional)" htmlFor="checkout-notes">
                <Textarea
                  id="checkout-notes"
                  value={contact.notes}
                  onChange={(event) =>
                    patchContact({ notes: event.target.value })
                  }
                />
              </Field>
              <button type="submit" className={buttonClassName()}>
                Continue to delivery
              </button>
            </form>
          ) : null}

          {step === "delivery" ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Delivery</h2>
              <CartShippingForm />
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className={buttonClassName({ variant: "ghost" })}
                  onClick={() => setStep("contact")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={buttonClassName()}
                  disabled={!shippingResult.ok}
                  onClick={() => setStep("payment")}
                >
                  Continue to payment
                </button>
              </div>
              {!shippingResult.ok ? (
                <p className="text-caption text-danger" role="alert">
                  Select a shipping method (and area when required) to continue.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "payment" ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Payment</h2>
              <CartPaymentForm />
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className={buttonClassName({ variant: "ghost" })}
                  onClick={() => setStep("delivery")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={buttonClassName()}
                  disabled={!paymentMethod}
                  onClick={() => setStep("review")}
                >
                  Continue to review
                </button>
              </div>
              {!paymentMethod ? (
                <p className="text-caption text-danger" role="alert">
                  Select a payment method to continue.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Review</h2>
              <dl className="space-y-3 border border-border bg-surface-muted/40 p-4 text-body">
                <div>
                  <dt className="text-caption text-text-muted">Contact</dt>
                  <dd className="text-text">
                    {contact.fullName} · {contact.phone} · {contact.email}
                  </dd>
                  <dd className="text-text-muted">{contact.addressLine}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-muted">Shipping</dt>
                  <dd className="text-text">
                    {shippingResult.ok
                      ? `${shippingResult.method.name}${
                          shippingResult.area
                            ? ` · ${shippingResult.area.name}`
                            : ""
                        }`
                      : "Not selected"}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-text-muted">Payment</dt>
                  <dd className="text-text">
                    {paymentMethod?.name ?? "Not selected"} (mock — not charged)
                  </dd>
                </div>
              </dl>
              <ul className="divide-y divide-border border border-border">
                {rows.map(({ line, product, lineTotal }) => (
                  <li
                    key={line.slug}
                    className="flex justify-between gap-3 px-4 py-3 text-label"
                  >
                    <span className="text-text">
                      {product.name}{" "}
                      <span className="text-text-muted">× {line.quantity}</span>
                    </span>
                    <span className="tabular-nums text-text">
                      {formatMoney({ amount: lineTotal })}
                    </span>
                  </li>
                ))}
              </ul>
              <Alert tone="warning" title="No real order is created">
                <p className="text-caption">
                  Placing this order only stores a local mock receipt and clears
                  the cart. It does not charge a card or create a server order.
                </p>
              </Alert>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClassName({ variant: "ghost" })}
                  onClick={() => setStep("payment")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={buttonClassName()}
                  disabled={
                    placing ||
                    pending ||
                    !shippingResult.ok ||
                    !paymentMethod ||
                    rows.length === 0
                  }
                  onClick={placeMockOrder}
                >
                  {placing ? "Placing…" : "Place mock order"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="overflow-hidden border border-border bg-surface lg:sticky lg:top-24">
          <div className="border-b border-border bg-text px-5 py-3">
            <h2 className="text-label font-semibold tracking-tight text-primary-foreground">
              Order summary
            </h2>
          </div>
          <div className="space-y-3 px-5 py-4">
            {pending && rows.length === 0 ? (
              <p className="text-caption text-text-muted">Loading…</p>
            ) : (
              <>
                <p className="flex justify-between text-body">
                  <span>Subtotal ({itemCount})</span>
                  <span className="tabular-nums">
                    {formatMoney({ amount: subtotal })}
                  </span>
                </p>
                {discountAmount > 0 ? (
                  <p className="flex justify-between text-body text-success">
                    <span>Coupon</span>
                    <span className="tabular-nums">
                      −{formatMoney({ amount: discountAmount })}
                    </span>
                  </p>
                ) : null}
                <p className="flex justify-between text-body">
                  <span>Shipping</span>
                  <span className="tabular-nums">
                    {shippingResult.ok
                      ? shippingAmount === 0
                        ? "Free"
                        : formatMoney({ amount: shippingAmount })
                      : "—"}
                  </span>
                </p>
                <p className="flex justify-between border-t border-border pt-3 text-label font-semibold">
                  <span>Estimated total</span>
                  <span className="tabular-nums">
                    {formatMoney({ amount: displayTotal })}
                  </span>
                </p>
                <p className="text-caption text-text-muted">
                  Display only. Adjust coupon on the{" "}
                  <Link
                    href="/cart"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    cart
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import type { PaymentBrowserReturn } from "@/lib/payments/return";
import type { CustomerOrderView } from "@/lib/orders/order-view";

function returnCopy(status: PaymentBrowserReturn | null): {
  title: string;
  tone: "info" | "warning";
  body: string;
} {
  if (status === "fail") {
    return {
      title: "Payment was not completed",
      tone: "warning",
      body: "The gateway sent you back without a completed payment. This page does not change the order. It stays unpaid until a verified server callback arrives.",
    };
  }
  if (status === "cancel") {
    return {
      title: "Payment was cancelled",
      tone: "warning",
      body: "Checkout was cancelled on the gateway. This page does not change the order. It stays unpaid until a verified server callback arrives.",
    };
  }
  if (status === "success") {
    return {
      title: "Returned from payment",
      tone: "info",
      body: "The gateway sent you back to this site. That is not proof of payment. Techno House will only mark the order paid after a verified server-to-server confirmation.",
    };
  }
  return {
    title: "Returned from payment",
    tone: "info",
    body: "If you just left a payment page, the order is not marked paid from this screen. Wait for gateway confirmation or contact support with your order number.",
  };
}

export function PaymentReturnView({
  order,
  status,
}: {
  order: CustomerOrderView | null;
  status: PaymentBrowserReturn | null;
}) {
  const copy = returnCopy(status);
  const confirmationHref = order
    ? `/checkout/confirmation?order=${encodeURIComponent(order.number)}`
    : "/checkout/confirmation";

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/checkout", label: "Checkout" },
          { href: "/checkout/payment/return", label: "Payment return" },
        ]}
      />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text">
        {copy.title}
      </h1>
      <div className="mt-6 max-w-2xl space-y-4">
        <Alert tone={copy.tone} title="Payment is not confirmed here">
          <p className="text-caption">{copy.body}</p>
        </Alert>
        {order ? (
          <p className="text-body text-text">
            Order{" "}
            <span className="font-mono font-medium text-primary">
              {order.number}
            </span>{" "}
            is still recorded as {order.paymentStatus.replaceAll("_", " ")}.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Link href={confirmationHref} className={buttonClassName()}>
            View order confirmation
          </Link>
          <Link
            href="/account/orders"
            className={buttonClassName({ variant: "secondary" })}
          >
            Account orders
          </Link>
        </div>
      </div>
    </div>
  );
}

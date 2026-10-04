import Link from "next/link";
import { ClipboardList, CreditCard, Truck } from "lucide-react";

/**
 * Payment / shipping / order-procedure cards. Three across when their own
 * container is wide enough, stacked when it is not — so the same component sits
 * in the buy box on a phone and under the gallery on a desktop.
 */
export function ProductServiceCards() {
  return (
    <div className="@container">
      <div className="grid gap-2 @xl:grid-cols-3">
        {[
          {
            label: "Payment method",
            href: "/checkout",
            note: "SSLCommerz, bKash, Nagad, and cash on delivery.",
            Icon: CreditCard,
          },
          {
            label: "Shipping & charge",
            href: "/shipping",
            note: "Dhaka delivery, nationwide courier, and store pickup zones.",
            Icon: Truck,
          },
          {
            label: "Order procedure",
            href: "/faq",
            note: "Browse, cart, checkout, and confirmation — display-only flow.",
            Icon: ClipboardList,
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group/info flex gap-2.5 rounded-lg border border-border bg-surface p-3 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-sm"
          >
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors group-hover/info:bg-primary group-hover/info:text-primary-foreground">
              <item.Icon
                aria-hidden
                className="size-4"
                strokeWidth={1.75}
              />
            </span>
            <span className="min-w-0">
              <span className="block text-caption font-bold text-text">
                {item.label}
              </span>
              {/* The note used to live in a `title` tooltip — invisible on
                  touch and to most people. */}
              <span className="mt-0.5 block text-[0.7rem] leading-snug text-text-muted">
                {item.note}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

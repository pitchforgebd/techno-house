import Link from "next/link";
import { ClipboardList, CreditCard, Truck } from "lucide-react";

/**
 * Payment / shipping / order-procedure cards — icon and title only. Three across when their own
 * container is wide enough, stacked when it is not — so the same component sits
 * in the buy box on a phone and under the gallery on a desktop.
 */
export function ProductServiceCards() {
  return (
    <div className="@container">
      <div className="grid gap-2 @md:grid-cols-3">
        {[
          {
            label: "Payment method",
            href: "/checkout",
            Icon: CreditCard,
          },
          {
            label: "Shipping & charge",
            href: "/shipping",
            Icon: Truck,
          },
          {
            label: "Order procedure",
            href: "/faq",
            Icon: ClipboardList,
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group/info flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md"
          >
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors group-hover/info:bg-primary group-hover/info:text-primary-foreground">
              <item.Icon
                aria-hidden
                className="size-3.5"
                strokeWidth={1.75}
              />
            </span>
            <span className="min-w-0 text-[0.75rem] font-semibold leading-tight text-text">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

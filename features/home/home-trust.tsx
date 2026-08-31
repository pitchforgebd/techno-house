import { Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { createLucideIcon } from "@/components/icons/create-lucide-icon";

const IconWarranty = createLucideIcon(ShieldCheck, "size-7");
const IconDelivery = createLucideIcon(Truck, "size-7");
const IconSupport = createLucideIcon(Headphones, "size-7");
const IconReturns = createLucideIcon(RotateCcw, "size-7");

const TRUST_POINTS = [
  {
    title: "Warranty",
    description:
      "Coverage terms sit on each product page before you add to cart.",
    href: "/warranty",
    Icon: IconWarranty,
  },
  {
    title: "Nationwide delivery",
    description:
      "Shipping options and zones are shown before you place an order.",
    href: "/shipping",
    Icon: IconDelivery,
  },
  {
    title: "Support desk",
    description: "Help, FAQ, and product requests — open 9:00–22:00.",
    href: "/support",
    Icon: IconSupport,
  },
  {
    title: "Returns",
    description: "Clear return windows and steps on the returns policy page.",
    href: "/returns",
    Icon: IconReturns,
  },
] as const;

export function HomeTrust() {
  return (
    <section aria-labelledby="home-trust" className="scroll-mt-4">
      <div className="flex items-stretch">
        <h2
          id="home-trust"
          className="flex shrink-0 items-center bg-text px-4 py-2 pr-7 text-label font-semibold tracking-tight text-primary-foreground [clip-path:polygon(0_0,calc(100%-0.85rem)_0,100%_100%,0_100%)]"
        >
          Shopping here
        </h2>
        <div className="flex min-w-0 flex-1 items-end justify-end border-b-2 border-text pb-1.5">
          <Link
            href="/support"
            className="text-caption font-medium text-primary underline-offset-2 hover:underline"
          >
            Support &amp; policies
          </Link>
        </div>
      </div>

      <div className="mt-8 border border-border bg-border">
        <ul className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map(({ href, title, description, Icon }) => (
            <li key={href} className="bg-surface">
              <Link
                href={href}
                className="group flex h-full flex-col gap-3 px-5 py-6 transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:px-6 sm:py-7"
              >
                <span className="inline-flex size-12 items-center justify-center bg-text text-primary-foreground transition-colors group-hover:bg-primary">
                  <Icon />
                </span>
                <span className="text-label font-semibold tracking-tight text-text group-hover:text-primary">
                  {title}
                </span>
                <span className="text-caption leading-relaxed text-text-muted">
                  {description}
                </span>
                <span className="mt-auto pt-1 text-caption font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Learn more
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

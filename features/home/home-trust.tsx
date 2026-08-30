import type { SVGProps } from "react";
import Link from "next/link";

const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
  className: "size-7",
};

function IconWarranty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M12 3 5 6v5c0 4.5 2.8 7.4 7 9 4.2-1.6 7-4.5 7-9V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" />
    </svg>
  );
}

function IconDelivery(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M3 7h11v10H3V7Z" />
      <path d="M14 10h4l3 3v4h-7v-7Z" />
      <circle cx="7" cy="18.5" r="1.5" />
      <circle cx="17.5" cy="18.5" r="1.5" />
    </svg>
  );
}

function IconSupport(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M5 12a7 7 0 0 1 14 0" />
      <path d="M4 12v3a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2Zm16 0v3a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Z" />
      <path d="M12 19v2M9 21h6" />
    </svg>
  );
}

function IconReturns(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M4 12a8 8 0 0 1 13.5-5.8L20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.5 5.8L4 20v-5h5" />
    </svg>
  );
}

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

import { ArrowRight, Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { createLucideIcon } from "@/components/icons/create-lucide-icon";
import { HomeSectionHeader } from "@/features/home/home-section-header";

const IconWarranty = createLucideIcon(ShieldCheck, "size-5");
const IconDelivery = createLucideIcon(Truck, "size-5");
const IconSupport = createLucideIcon(Headphones, "size-5");
const IconReturns = createLucideIcon(RotateCcw, "size-5");

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

/**
 * Dark trust strip.
 *
 * Colour note: the icons and "Learn more" links used `text-primary`
 * directly on `bg-text`, which measured 2.38:1 under the old teal and is
 * no better under the new blue — under
 * the 4.5:1 AA floor, and barely visible in practice. Both now use
 * `primary-soft`, the light tint of the same hue, at 15.2:1. `primary`
 * survives only as a tile fill behind a light glyph, where it is a surface
 * rather than the thing being read.
 */
export function HomeTrust() {
  return (
    <section aria-labelledby="home-trust" className="scroll-mt-4">
      <HomeSectionHeader
        id="home-trust"
        title="Shopping here"
        lede="What you can count on before, during, and after an order."
        actionHref="/support"
        actionLabel="Support & policies"
      />

      <div className="relative isolate mt-6 overflow-hidden rounded-sm bg-text">
        {/* Same washes as the PC Builder panel so the two dark blocks on the
            page read as one material rather than two flat slabs. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 -z-10 size-72 rounded-full bg-primary/35 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -bottom-28 -z-10 size-72 rounded-full bg-primary-bright/25 blur-3xl"
        />
        <ul className="grid gap-px bg-surface/10 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map(({ href, title, description, Icon }) => (
            <li key={href} className="bg-text/60">
              <Link
                href={href}
                className="group relative flex h-full flex-col gap-4 px-6 py-7 transition-colors duration-300 hover:bg-surface/[0.05] focus-visible:bg-surface/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-soft sm:px-7 sm:py-8"
              >
                {/* Accent wipe on hover. Uses `primary`, not `secondary`:
                    the navy secondary is 1.41:1 on this ink panel, i.e.
                    invisible. Blue on near-black is what the logo does. */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-primary-bright transition-transform duration-300 ease-out group-hover:scale-x-100"
                />

                <span className="inline-flex size-11 items-center justify-center rounded-sm bg-primary/30 text-primary-soft ring-1 ring-surface/10 transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon />
                </span>

                <span>
                  <span className="block text-label font-semibold tracking-tight text-surface">
                    {title}
                  </span>
                  <span className="mt-1.5 block text-caption leading-relaxed text-surface/65">
                    {description}
                  </span>
                </span>

                <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-caption font-semibold text-primary-soft/85 transition-colors group-hover:text-primary-soft">
                  Learn more
                  <ArrowRight
                    aria-hidden
                    strokeWidth={2}
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

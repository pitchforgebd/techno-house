import { ArrowRight, Cpu, LayoutGrid, MessageSquare } from "lucide-react";
import Link from "next/link";
import { createLucideIcon } from "@/components/icons/create-lucide-icon";
import { HomeSectionHeader } from "@/features/home/home-section-header";

const IconBrowse = createLucideIcon(LayoutGrid, "size-5");
const IconBuild = createLucideIcon(Cpu, "size-5");
const IconRequest = createLucideIcon(MessageSquare, "size-5");

const NOTES = [
  {
    title: "Browse by category",
    description:
      "Open the shop, pick a department, then narrow by brand, price, or specs.",
    href: "/shop",
    cta: "Open shop",
    Icon: IconBrowse,
  },
  {
    title: "Build before you buy",
    description:
      "Fill PC Builder slots, check compatibility, and review the total in ৳.",
    href: "/pc-builder",
    cta: "Start PC Builder",
    Icon: IconBuild,
  },
  {
    title: "Ask for a product",
    description:
      "Missing a SKU? Send a short product request — we use it for merchandising cues.",
    href: "/product-request",
    cta: "Request a product",
    Icon: IconRequest,
  },
] as const;

/**
 * Three routes into the catalog.
 *
 * The old cards numbered themselves 01/02/03, which implied a sequence
 * these three do not have — they are alternatives, not steps. The numbers
 * are gone; the icon carries the identity and the card ends on its action
 * instead of trailing off into empty space.
 */
export function HomeContent() {
  return (
    <section aria-labelledby="home-content" className="scroll-mt-4">
      <HomeSectionHeader
        id="home-content"
        title="Guides"
        lede="Three short routes through the catalog."
        actionHref="/faq"
        actionLabel="Visit FAQ"
      />

      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {NOTES.map(({ href, title, description, cta, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-border bg-surface p-5 transition-[border-color,box-shadow,transform] duration-300 ease-out hover:border-primary/35 hover:shadow-[0_14px_34px_-22px_rgb(14_26_36/0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:hover:-translate-y-0.5 sm:p-6"
            >
              {/* Same hover wipe as the trust strip, so both sections
                  announce interactivity the same way. */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-secondary transition-transform duration-300 ease-out group-hover:scale-x-100"
              />

              <span className="inline-flex size-12 items-center justify-center rounded-sm bg-gradient-to-br from-primary-soft to-primary-soft/40 text-primary ring-1 ring-primary/10 transition-colors duration-300 group-hover:from-primary group-hover:to-primary-hover group-hover:text-primary-foreground group-hover:ring-primary/40">
                <Icon />
              </span>

              <span className="mt-5 block text-lg font-semibold tracking-tight text-text transition-colors group-hover:text-primary">
                {title}
              </span>
              <span className="mt-2 block text-label leading-relaxed text-text-muted">
                {description}
              </span>

              <span className="mt-auto flex items-center gap-1.5 border-t border-border/70 pt-4 text-label font-semibold text-primary">
                {cta}
                <ArrowRight
                  aria-hidden
                  strokeWidth={2}
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { ArrowRight, Cpu, LayoutGrid, MessageSquare } from "lucide-react";
import Link from "next/link";
import { createLucideIcon } from "@/components/icons/create-lucide-icon";

const IconBrowse = createLucideIcon(LayoutGrid, "size-7");
const IconBuild = createLucideIcon(Cpu, "size-7");
const IconRequest = createLucideIcon(MessageSquare, "size-7");

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

export function HomeContent() {
  return (
    <section aria-labelledby="home-content" className="scroll-mt-4">
      <div className="flex items-stretch">
        <h2
          id="home-content"
          className="flex shrink-0 items-center bg-text px-4 py-2 pr-7 text-label font-semibold tracking-tight text-primary-foreground [clip-path:polygon(0_0,calc(100%-0.85rem)_0,100%_100%,0_100%)]"
        >
          Guides
        </h2>
        <div className="flex min-w-0 flex-1 items-end justify-end border-b-2 border-text pb-1.5">
          <Link
            href="/faq"
            className="text-caption font-medium text-primary underline-offset-2 hover:underline"
          >
            FAQ
          </Link>
        </div>
      </div>

      <div className="mt-8 border border-border bg-border">
        <ul className="grid gap-px md:grid-cols-3">
          {NOTES.map(({ href, title, description, cta, Icon }) => (
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
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-caption font-medium text-primary">
                  {cta}
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.75}
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

import Link from "next/link";
import { FooterCtaButtons } from "@/components/layout/footer-cta-buttons";
import { IconMapPin, IconPhone } from "@/components/layout/footer-icons";
import {
  FOOTER_SOCIAL_BRAND_COLORS,
  FOOTER_SOCIAL_BRAND_ICONS,
  type FooterSocialBrand,
} from "@/components/icons/social-brand-icons";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_POLICY_LINKS,
  FOOTER_SOCIAL,
} from "@/lib/catalog/footer-nav";
import { cn } from "@/lib/cn";

const linkClassName =
  "inline-flex min-h-9 items-center text-label text-primary-foreground/75 transition-colors hover:text-primary-foreground";

export function SiteFooter() {
  return (
    <footer className="bg-text pb-16 text-primary-foreground md:pb-0">
      <div className="mx-auto grid max-w-catalog gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        <div className="lg:pr-8">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-primary"
          >
            Techno House
          </Link>
          <p className="mt-3 max-w-xs text-caption text-primary-foreground/65">
            Technology for work, study, and building a PC. Prices in ৳ are
            display-only.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Social">
            {FOOTER_SOCIAL.map((item) => {
              const label = item.label as FooterSocialBrand;
              const Icon = FOOTER_SOCIAL_BRAND_ICONS[label];
              const hoverClass = FOOTER_SOCIAL_BRAND_COLORS[label];
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-full border border-primary-foreground/25 text-primary-foreground/80 transition-colors",
                      hoverClass,
                    )}
                  >
                    {Icon ? <Icon className="size-[1.125rem]" /> : item.label.slice(0, 1)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <FooterCtaButtons />
          <form
            action="/account/orders"
            method="get"
            className="mt-5 flex max-w-xs overflow-hidden rounded-md border border-primary-foreground/25 bg-primary-foreground/5"
            role="search"
            aria-label="Track order"
          >
            <label htmlFor="footer-track" className="sr-only">
              Order ID or phone
            </label>
            <input
              id="footer-track"
              name="q"
              type="search"
              placeholder="Order ID or phone"
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-label text-primary-foreground placeholder:text-primary-foreground/45 focus-visible:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 border-l border-primary-foreground/25 px-4 text-label font-medium text-primary hover:bg-primary-foreground/10"
            >
              Track
            </button>
          </form>
          <p className="mt-2 max-w-xs text-caption text-primary-foreground/45">
            Tracking is display-only in this build.
          </p>
        </div>

        <nav
          aria-labelledby="footer-company"
          className="lg:border-l lg:border-primary-foreground/15 lg:px-8"
        >
          <h2
            id="footer-company"
            className="text-label font-semibold tracking-tight text-primary-foreground"
          >
            Company
          </h2>
          <ul className="mt-4 flex flex-col gap-0.5">
            {FOOTER_COMPANY_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClassName}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav
          aria-labelledby="footer-policies"
          className="lg:border-l lg:border-primary-foreground/15 lg:px-8"
        >
          <h2
            id="footer-policies"
            className="text-label font-semibold tracking-tight text-primary-foreground"
          >
            Policies
          </h2>
          <ul className="mt-4 flex flex-col gap-0.5">
            {FOOTER_POLICY_LINKS.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link href={item.href} className={linkClassName}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:border-l lg:border-primary-foreground/15 lg:pl-8">
          <h2
            id="footer-contact"
            className="text-label font-semibold tracking-tight text-primary-foreground"
          >
            Contact us
          </h2>
          <div className="mt-4 space-y-3 text-label text-primary-foreground/75">
            <p>
              <span className="font-medium text-primary-foreground">
                Support desk
              </span>
              <br />
              Nationwide retail · Bangladesh
              <br />
              Hours 9:00–22:00
            </p>
            <p className="flex items-start gap-2">
              <IconPhone className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Use the{" "}
                <Link
                  href="/contact"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  contact form
                </Link>{" "}
                for calls and messages. No public phone is published in this
                build.
              </span>
            </p>
            <p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 font-medium text-primary underline-offset-2 hover:underline"
              >
                <IconMapPin className="size-4" />
                See on map
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto max-w-catalog px-4 py-5">
          <div className="max-w-3xl space-y-1 text-caption text-primary-foreground/50">
            <p>
              Prices and stock may change without notice. Figures shown in ৳
              (BDT) are for display and are not a charge.
            </p>
            <p>
              © 2026 Techno House. All rights reserved. Specs and images are
              sample catalog data unless stated otherwise.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

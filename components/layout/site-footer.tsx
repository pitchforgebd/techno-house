import Link from "next/link";
import { FooterCtaButtons } from "@/components/layout/footer-cta-buttons";
import { FooterNewsletterForm } from "@/components/layout/footer-newsletter-form";
import { IconMapPin, IconPhone } from "@/components/layout/footer-icons";
import {
  FOOTER_SOCIAL_BRAND_COLORS,
  FOOTER_SOCIAL_BRAND_ICONS,
  type FooterSocialBrand,
} from "@/components/icons/social-brand-icons";
import {
  getStorefrontBranding,
  resolveChromeLogo,
} from "@/lib/business/storefront-branding";
import {
  formatFooterCopyright,
  getFooterWidgetsConfig,
} from "@/lib/content/footer-settings";
import { googleMapsEmbedSrc } from "@/lib/content/google-maps";
import { logoStyle } from "@/lib/business/logo-size";
import { cn } from "@/lib/cn";

/**
 * The footer sits on `--color-footer-background`, which is admin-editable and
 * defaults to the same near-black it always used. It was `bg-text` — the body
 * ink — so retinting paragraph colour silently retinted the whole footer.
 *
 * `text-primary` is close to unreadable on that dark ground, so accents here
 * use `primary-soft` (the light tint) and solid `bg-primary` buttons instead.
 * The newsletter submit button keeps `text-primary-foreground` deliberately:
 * it sits on `bg-primary`, so its label follows the BUTTON colour, not the
 * footer's.
 */
const linkClassName =
  "group/link inline-flex min-h-9 items-center text-label text-footer-text/70 transition-colors hover:text-footer-text";

const accentTextClass =
  "font-medium text-primary-soft underline-offset-4 transition-colors hover:text-footer-text hover:underline";

function FooterHeading({ id, children }: { id?: string; children: string }) {
  return (
    <div className="mb-4">
      <h2
        id={id}
        className="text-[0.72rem] font-bold tracking-[0.16em] text-footer-text uppercase"
      >
        {children}
      </h2>
      <span aria-hidden className="mt-2 block h-px w-9 bg-primary-soft/40" />
    </div>
  );
}

export async function SiteFooter() {
  const [branding, footer] = await Promise.all([
    getStorefrontBranding(),
    getFooterWidgetsConfig(),
  ]);
  const logoSrc = resolveChromeLogo(branding);
  const mapEmbedSrc = googleMapsEmbedSrc(branding.googleMapsUrl);
  const year = new Date().getFullYear();
  const copyrightLines = formatFooterCopyright(footer.copyrightText, {
    year,
    storeName: branding.storeName,
  });
  const columnCount = 1 + footer.columns.length + 1;
  const gridClass =
    columnCount <= 3
      ? "lg:grid-cols-3"
      : columnCount === 4
        ? "lg:grid-cols-4"
        : "lg:grid-cols-5";

  return (
    <footer className="bg-footer-background pb-16 text-footer-text md:pb-0">
      <div
        aria-hidden
        className="h-0.5 w-full bg-linear-to-r from-primary via-primary-soft/60 to-primary"
      />

      {footer.subFooterEnabled &&
      (footer.subFooterTitle || footer.subFooterDescription) ? (
        <div className="border-b border-footer-text/10 bg-footer-text/4">
          <div className="mx-auto max-w-catalog px-4 py-6 text-center sm:text-left">
            {footer.subFooterTitle ? (
              <p className="text-label font-semibold text-footer-text">
                {footer.subFooterTitle}
              </p>
            ) : null}
            {footer.subFooterDescription ? (
              <p className="mt-1 text-caption text-footer-text/70">
                {footer.subFooterDescription}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto grid max-w-catalog gap-x-8 gap-y-10 px-4 py-14 sm:grid-cols-2",
          gridClass,
        )}
      >
        <div className="lg:pr-6">
          <Link
            href="/"
            className="inline-flex items-center text-2xl font-bold tracking-tight text-primary"
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- storefront branding from SiteSettings / uploads
              <img
                src={logoSrc}
                alt={branding.storeName}
                style={logoStyle(branding.logoHeightPx)}
                className="object-contain"
              />
            ) : (
              branding.storeName
            )}
          </Link>
          {footer.aboutDescription ? (
            <p className="mt-4 max-w-xs text-caption leading-relaxed text-footer-text/60">
              {footer.aboutDescription}
            </p>
          ) : null}

          {footer.showSocial && footer.socialLinks.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Social">
              {footer.socialLinks.map((item) => {
                const label = item.network as FooterSocialBrand;
                const Icon = FOOTER_SOCIAL_BRAND_ICONS[label];
                const hoverClass = FOOTER_SOCIAL_BRAND_COLORS[label];
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-label={item.network}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        item.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className={cn(
                        "inline-flex size-10 items-center justify-center rounded-full border border-footer-text/15 bg-footer-text/5 text-footer-text/85 transition-[colors,transform] duration-200 motion-safe:hover:-translate-y-0.5",
                        hoverClass,
                      )}
                    >
                      {Icon ? (
                        <Icon className="size-[1.125rem]" />
                      ) : (
                        item.network.slice(0, 1)
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {footer.showCtaButtons ? <FooterCtaButtons /> : null}
          {footer.showNewsletter ? <FooterNewsletterForm /> : null}

          {footer.playStoreEnabled && footer.playStoreUrl ? (
            <p className="mt-5">
              <Link
                href={footer.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("text-label", accentTextClass)}
              >
                Get it on Google Play
              </Link>
            </p>
          ) : null}

          {footer.showTrackForm ? (
            <form
              action="/track"
              method="get"
              className="mt-5 flex max-w-xs overflow-hidden rounded-md border border-footer-text/15 bg-footer-text/5 transition-colors focus-within:border-primary-soft/50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-soft/60"
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
                className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-label text-footer-text placeholder:text-footer-text/40 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 bg-primary px-4 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Track
              </button>
            </form>
          ) : null}
        </div>

        {footer.columns.map((column) => (
          <nav
            key={column.id}
            aria-labelledby={`footer-col-${column.id}`}
          >
            <FooterHeading id={`footer-col-${column.id}`}>
              {column.title}
            </FooterHeading>
            <ul className="flex flex-col gap-0.5">
              {column.links.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={linkClassName}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      item.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <FooterHeading id="footer-contact">Contact us</FooterHeading>
          <div className="space-y-4 text-label text-footer-text/70">
            <p className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-footer-text/10 text-primary-soft">
                <IconMapPin className="size-4" />
              </span>
              <span className="leading-relaxed">
                <span className="font-semibold text-footer-text">
                  {branding.storeName}
                </span>
                {branding.address ? (
                  <>
                    <br />
                    {branding.address}
                  </>
                ) : null}
                {branding.city ? (
                  <>
                    <br />
                    {branding.city}
                  </>
                ) : null}
                {footer.contactHours ? (
                  <>
                    <br />
                    <span className="text-footer-text/55">
                      {footer.contactHours}
                    </span>
                  </>
                ) : null}
              </span>
            </p>

            {branding.extraAddresses.map((item) => (
              <p key={item.id} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-footer-text/10 text-primary-soft">
                  <IconMapPin className="size-4" />
                </span>
                <span className="leading-relaxed">
                  {item.title ? (
                    <span className="font-semibold text-footer-text">
                      {item.title}
                      <br />
                    </span>
                  ) : null}
                  {item.address}
                </span>
              </p>
            ))}

            {branding.phone ||
            branding.supportEmail ||
            branding.extraPhones.length > 0 ||
            branding.extraEmails.length > 0 ? (
              <p className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-footer-text/10 text-primary-soft">
                  <IconPhone className="size-4" />
                </span>
                <span className="space-y-1">
                  {branding.phone ? (
                    <a
                      href={branding.phoneHref}
                      className={cn("block", accentTextClass)}
                    >
                      {branding.phone}
                    </a>
                  ) : null}
                  {branding.extraPhones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                      className={cn("block", accentTextClass)}
                    >
                      {phone}
                    </a>
                  ))}
                  {branding.supportEmail ? (
                    <a
                      href={branding.emailHref}
                      className={cn("block break-all", accentTextClass)}
                    >
                      {branding.supportEmail}
                    </a>
                  ) : null}
                  {branding.extraEmails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className={cn("block break-all", accentTextClass)}
                    >
                      {email}
                    </a>
                  ))}
                </span>
              </p>
            ) : null}
            {footer.showContactFormLink ? (
              <p>
                <Link
                  href="/contact"
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-footer-text/15 bg-footer-text/5 px-3 text-label font-medium text-footer-text transition-colors hover:border-primary-soft/40 hover:bg-footer-text/10"
                >
                  Contact form
                </Link>
              </p>
            ) : null}

            {branding.googleMapsUrl ? (
              <div className="pt-1">
                {mapEmbedSrc ? (
                  <div className="overflow-hidden rounded-md border border-footer-text/15">
                    <iframe
                      src={mapEmbedSrc}
                      title={`${branding.storeName} location`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="h-40 w-full border-0"
                    />
                  </div>
                ) : null}
                <a
                  href={branding.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-2 inline-flex items-center gap-2",
                    accentTextClass,
                  )}
                >
                  View on Google Maps
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {footer.paymentMethodsImageSrc ? (
        <div className="border-t border-footer-text/10 bg-footer-text/4">
          <div className="mx-auto flex max-w-catalog flex-col items-center justify-center gap-3 px-4 py-6 sm:flex-row sm:gap-6">
            <p className="shrink-0 text-[0.72rem] font-bold tracking-[0.16em] text-footer-text/70 uppercase">
              We accept
            </p>
            <div className="flex w-full min-w-0 max-w-4xl justify-center sm:w-auto sm:flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={footer.paymentMethodsImageSrc}
                alt="Accepted payment methods"
                className="h-auto max-h-28 w-full object-contain object-center sm:max-h-32 md:max-h-36"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t border-footer-text/10">
        {/* `sm:pr-24` keeps the credit clear of the fixed chat widget
            (`bottom-5 right-5`, 56px) that floats over this corner. */}
        <div className="mx-auto flex max-w-catalog flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:pr-24">
          <div className="max-w-3xl space-y-1 text-caption leading-relaxed text-footer-text/55">
            {copyrightLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {/*
            Developer credit. Deliberately hardcoded — not part of
            `getFooterWidgetsConfig()` and not editable from Admin → Design
            Studio → Footer widgets, so it cannot be switched off from the
            panel. Do not move this into the database.
          */}
          <p className="shrink-0 text-caption text-footer-text/55 sm:text-right">
            Developed by{" "}
            <a
              href="https://pitchforgebd.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-soft underline-offset-4 transition-colors hover:text-footer-text hover:underline"
            >
              PitchForgeBD
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

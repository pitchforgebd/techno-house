import Image from "next/image";
import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { HeaderBuilderLink } from "@/components/layout/header-builder-link";
import { HeaderSearchForm } from "@/components/layout/header-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { loadNavTriggers } from "@/lib/catalog/nav-menu";
import {
  getStorefrontBranding,
  resolveChromeLogo,
} from "@/lib/business/storefront-branding";
import { logoStyle } from "@/lib/business/logo-size";
import { cn } from "@/lib/cn";
import { getImageSize, type ImageSize } from "@/lib/media/image-size";

function BrandMark({
  name,
  logoSrc,
  logoSize,
  heightPx,
  className,
}: {
  name: string;
  logoSrc: string | null;
  /** Intrinsic size: the width/height attributes reserve the logo's box at
   * the configured height before the file arrives (no layout shift). */
  logoSize: ImageSize | null;
  heightPx: number;
  className?: string;
}) {
  if (logoSrc && logoSize) {
    return (
      <Image
        src={logoSrc}
        alt={name}
        width={logoSize.width}
        height={logoSize.height}
        // Above the fold on every page: load right away, but it is not the
        // LCP element, so no preload/priority.
        loading="eager"
        style={logoStyle(heightPx)}
        className={cn("object-contain", className)}
      />
    );
  }
  if (logoSrc) {
    return (
      // Height comes from Design Studio -> Logo, so it is an inline style
      // rather than a Tailwind class: the value is arbitrary at runtime and
      // no class can be generated for it at build time.
      // eslint-disable-next-line @next/next/no-img-element -- storefront branding from SiteSettings / uploads
      <img
        src={logoSrc}
        alt={name}
        style={logoStyle(heightPx)}
        className={cn("object-contain", className)}
      />
    );
  }
  return <span className={className}>{name}</span>;
}

export async function SiteHeader() {
  // Top-level departments only; the drawer loads the rest on first open.
  const [roots, branding] = await Promise.all([
    loadNavTriggers(),
    getStorefrontBranding(),
  ]);
  const logoSrc = resolveChromeLogo(branding);
  const logoSize = await getImageSize(logoSrc);

  return (
    <header className="bg-header-background text-header-text shadow-md">
      <div className="mx-auto max-w-catalog px-4 py-3">
        {/* Mobile: brand row + full-width search */}
        <div className="flex flex-col gap-3 md:hidden">
          <div className="flex items-center gap-2">
            <MobileNav roots={roots} />
            <Link
              href="/"
              className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-header-text"
            >
              <BrandMark
                name={branding.storeName}
                logoSrc={logoSrc}
                logoSize={logoSize}
                heightPx={branding.logoHeightPx}
              />
            </Link>
            <HeaderActions />
          </div>
          <HeaderSearchForm id="header-search-mobile" className="w-full" />
        </div>

        {/* Desktop: logo · search · builder · actions */}
        <div className="hidden items-center gap-4 md:flex lg:gap-6">
          <Link
            href="/"
            className="shrink-0 text-xl font-bold tracking-tight text-header-text"
          >
            <BrandMark
              name={branding.storeName}
              logoSrc={logoSrc}
              logoSize={logoSize}
              heightPx={branding.logoHeightPx}
            />
          </Link>
          {/* No `mx-auto`/`max-w-*` here: the search has to absorb all the
              slack, otherwise the leftover space collects to its right and
              pushes the CTA and the action icons off toward the edge. */}
          <HeaderSearchForm id="header-search" className="min-w-0 flex-1" />
          <div className="flex shrink-0 items-center gap-3 lg:gap-4">
            <HeaderBuilderLink />
            <span
              aria-hidden
              className="hidden h-7 w-px bg-header-text/15 lg:block"
            />
            <HeaderActions />
          </div>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { HeaderBuilderLink } from "@/components/layout/header-builder-link";
import { IconSearch } from "@/components/layout/chrome-icons";
import { MobileNav } from "@/components/layout/mobile-nav";
import { loadNavCatalog } from "@/lib/catalog/nav-data";
import {
  getStorefrontBranding,
  resolveChromeLogo,
} from "@/lib/business/storefront-branding";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/search/query";
import { logoStyle } from "@/lib/business/logo-size";
import { cn } from "@/lib/cn";

function HeaderSearchForm({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={cn(
        "flex min-w-0 overflow-hidden rounded-sm bg-surface",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Enter your keyword..."
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        autoComplete="off"
        className="min-h-10 w-full min-w-0 bg-transparent px-3 text-body text-text placeholder:text-text-muted focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex min-h-10 shrink-0 items-center justify-center bg-primary px-4 text-primary-foreground transition-colors hover:bg-primary-hover"
        aria-label="Search"
      >
        <IconSearch />
      </button>
    </form>
  );
}

function BrandMark({
  name,
  logoSrc,
  heightPx,
  className,
}: {
  name: string;
  logoSrc: string | null;
  heightPx: number;
  className?: string;
}) {
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
  const [{ tree, brandsByCategory }, branding] = await Promise.all([
    loadNavCatalog(),
    getStorefrontBranding(),
  ]);
  const mobileTree = tree.map((node) => ({
    slug: node.slug,
    name: node.name,
    children: node.children.map((child) => ({
      slug: child.slug,
      name: child.name,
    })),
  }));
  const logoSrc = resolveChromeLogo(branding);

  return (
    <header className="bg-header-background text-header-text shadow-md">
      <div className="mx-auto max-w-catalog px-4 py-3">
        {/* Mobile: brand row + full-width search */}
        <div className="flex flex-col gap-3 md:hidden">
          <div className="flex items-center gap-2">
            <MobileNav tree={mobileTree} brandsByCategory={brandsByCategory} />
            <Link
              href="/"
              className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-header-text"
            >
              <BrandMark
                name={branding.storeName}
                logoSrc={logoSrc}
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

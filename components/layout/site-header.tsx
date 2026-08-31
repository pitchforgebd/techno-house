import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { HeaderBuilderLink } from "@/components/layout/header-builder-link";
import { IconSearch } from "@/components/layout/chrome-icons";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadNavCatalog } from "@/lib/catalog/nav-data";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/search/query";

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
      className={className}
    >
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <Input
        id={id}
        name="q"
        type="search"
        placeholder="Search products"
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        autoComplete="off"
        className="min-h-11 rounded-r-none bg-surface"
      />
      <Button
        type="submit"
        className="shrink-0 rounded-l-none px-3 sm:px-4"
        aria-label="Search"
      >
        <IconSearch />
        <span className="sr-only">Search</span>
      </Button>
    </form>
  );
}

export async function SiteHeader() {
  const { tree, brandsByCategory } = await loadNavCatalog();
  const mobileTree = tree.map((node) => ({
    slug: node.slug,
    name: node.name,
    children: node.children.map((child) => ({
      slug: child.slug,
      name: child.name,
    })),
  }));

  return (
    <header className="border-b border-border bg-surface-muted">
      <div className="mx-auto max-w-catalog px-4 py-3">
        {/* Mobile: brand row + full-width search */}
        <div className="flex flex-col gap-3 md:hidden">
          <div className="flex items-center gap-2">
            <MobileNav tree={mobileTree} brandsByCategory={brandsByCategory} />
            <Link
              href="/"
              className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-primary"
            >
              Techno House
            </Link>
            <HeaderActions />
          </div>
          <HeaderSearchForm id="header-search-mobile" className="flex w-full min-w-0" />
        </div>

        {/* Desktop: single row */}
        <div className="hidden items-center gap-4 md:flex lg:gap-5">
          <Link
            href="/"
            className="shrink-0 text-xl font-bold tracking-tight text-primary"
          >
            Techno House
          </Link>
          <HeaderSearchForm
            id="header-search"
            className="flex min-w-0 flex-1"
          />
          <HeaderBuilderLink />
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}

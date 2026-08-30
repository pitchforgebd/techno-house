import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { HeaderBuilderLink } from "@/components/layout/header-builder-link";
import { IconSearch } from "@/components/layout/chrome-icons";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadNavCatalog } from "@/lib/catalog/nav-data";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/search/query";

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
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-catalog items-center gap-3 px-4 py-3 sm:gap-5">
        <MobileNav tree={mobileTree} brandsByCategory={brandsByCategory} />
        <Link
          href="/"
          className="shrink-0 text-xl font-bold tracking-tight text-primary"
        >
          Techno House
        </Link>
        <form
          action="/search"
          method="get"
          role="search"
          className="flex min-w-0 flex-1"
        >
          <label htmlFor="header-search" className="sr-only">
            Search products
          </label>
          <Input
            id="header-search"
            name="q"
            type="search"
            placeholder="Search products"
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            autoComplete="off"
            className="min-h-11 rounded-r-none"
          />
          <Button
            type="submit"
            className="shrink-0 rounded-l-none px-4"
            aria-label="Search"
          >
            <IconSearch />
            <span className="sr-only">Search</span>
          </Button>
        </form>
        <HeaderBuilderLink className="hidden md:inline-flex" />
        <HeaderActions />
      </div>
    </header>
  );
}

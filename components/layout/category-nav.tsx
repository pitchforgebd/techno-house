import { CategoryMegaNav } from "@/components/layout/category-mega-nav";
import { loadNavTriggers } from "@/lib/catalog/nav-menu";
import { PRIMARY_NAV_END, PRIMARY_NAV_START } from "@/lib/catalog/primary-nav";

export async function CategoryNav() {
  // Department links only; the panels load from /api/nav-menu on first use.
  const triggers = await loadNavTriggers();

  return (
    <nav
      aria-label="Product categories"
      className="sticky top-0 z-40 hidden border-t border-header-text/10 bg-header-background md:block"
    >
      <CategoryMegaNav
        triggers={triggers}
        startLinks={PRIMARY_NAV_START}
        endLinks={PRIMARY_NAV_END}
      />
    </nav>
  );
}

import { CategoryMegaNav } from "@/components/layout/category-mega-nav";
import { buildMegaMenuPanels } from "@/lib/catalog/mega-menu";
import { loadNavCatalog } from "@/lib/catalog/nav-data";
import { PRIMARY_NAV_END, PRIMARY_NAV_START } from "@/lib/catalog/primary-nav";

export async function CategoryNav() {
  const { tree, brandsByCategory } = await loadNavCatalog();
  const panels = buildMegaMenuPanels(tree, brandsByCategory);

  return (
    <nav
      aria-label="Product categories"
      className="relative z-30 hidden border-t border-header-text/10 bg-header-background md:block"
    >
      <CategoryMegaNav
        panels={panels}
        startLinks={PRIMARY_NAV_START}
        endLinks={PRIMARY_NAV_END}
      />
    </nav>
  );
}

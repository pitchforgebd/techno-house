/**
 * Mega-menu / mobile-drawer data, split so the initial HTML carries only the
 * top-level departments (SEO phase 4, D6).
 *
 * Before: every page shipped every department's full panel (all subcategory
 * and brand links) twice — as the desktop mega-menu's props and as the mobile
 * drawer's tree, which was rendered into the DOM even while closed. That was
 * ~470 category links and ~330 KB of serialized props per page.
 *
 * Now the page renders the department links (`loadNavTriggers`) and the
 * panels + drawer tree are fetched once from `/api/nav-menu` the first time
 * the menu is used (`loadNavMenuPayload`). Every subcategory stays linked
 * from its parent category page (the "Subcategories" row) and is in the
 * sitemap, so no category is orphaned by this.
 */
import { cache } from "react";
import { buildMegaMenuPanels, hasMegaMenu, type MegaBrand, type MegaMenuPanel } from "@/lib/catalog/mega-menu";
import { loadNavCatalog } from "@/lib/catalog/nav-data";

export type NavTrigger = {
  slug: string;
  name: string;
  href: string;
  /** Has a mega panel (otherwise a plain link). */
  hasMenu: boolean;
};

export type MobileNavCategory = {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
};

export type NavMenuPayload = {
  panels: MegaMenuPanel[];
  mobile: {
    tree: MobileNavCategory[];
    brandsByCategory: Record<string, MegaBrand[]>;
  };
};

// Deduped per request: the header (drawer) and the category bar both need it.
export const loadNavMenuPayload = cache(async (): Promise<NavMenuPayload> => {
  const { tree, brandsByCategory, categories } = await loadNavCatalog();
  return {
    panels: buildMegaMenuPanels(tree, brandsByCategory, categories),
    mobile: {
      tree: tree.map((node) => ({
        slug: node.slug,
        name: node.name,
        children: node.children.map((child) => ({
          slug: child.slug,
          name: child.name,
        })),
      })),
      brandsByCategory,
    },
  };
});

/** Department links rendered in the page itself (desktop bar + drawer). */
export async function loadNavTriggers(): Promise<NavTrigger[]> {
  const { panels } = await loadNavMenuPayload();
  return panels.map((panel) => ({
    slug: panel.slug,
    name: panel.name,
    href: panel.href,
    hasMenu: hasMegaMenu(panel),
  }));
}

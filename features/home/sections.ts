export const HOME_SECTIONS = [
  {
    id: "home-hero",
    title: "Techno House",
    description: "Laptops, components, and PC builds specified before you buy.",
    heading: "h1",
  },
  {
    id: "home-categories",
    title: "Top Categories",
    description: "Shortcut icons into key departments.",
    heading: "h2",
  },
  {
    id: "home-featured",
    title: "Featured",
    description: "A short list from the current catalog.",
    heading: "h2",
  },
  {
    id: "home-deals",
    title: "Deals",
    description: "Marked-down items from the catalog.",
    heading: "h2",
  },
  {
    id: "home-pc-builder",
    title: "PC Builder",
    description: "Image promo with slot, compatibility, and total cues.",
    heading: "h2",
  },
  {
    id: "home-brands",
    title: "Brands",
    description: "Brand logo grid with a link to explore all brands.",
    heading: "h2",
  },
  {
    id: "home-trust",
    title: "Shopping here",
    description: "Warranty, delivery, support, and returns — ribbon + policy grid.",
    heading: "h2",
  },
  {
    id: "home-content",
    title: "Guides",
    description: "Shop, PC Builder, and product-request cues — ribbon + guide grid.",
    heading: "h2",
  },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

export type MediaKind = "image" | "svg";

export type MediaFolder =
  | "products"
  | "brands"
  | "home"
  | "general"
  | "categories"
  | "flash-sales"
  | "promotions";


export type AdminMediaAsset = {
  id: string;
  filename: string;
  path: string;
  kind: MediaKind;
  folder: MediaFolder;
  alt: string;
  sizeLabel: string;
  dimensions: string;
  uploadedAt: string;
  uploadedAtSort: string;
  usedIn: string[];
};

function asset(
  partial: Omit<AdminMediaAsset, "kind"> & { kind?: MediaKind },
): AdminMediaAsset {
  return { kind: "svg", ...partial };
}

export const MOCK_ADMIN_MEDIA: readonly AdminMediaAsset[] = [
  asset({
    id: "media-ridge-16",
    filename: "ridge-16.svg",
    path: "/products/ridge-16.svg",
    folder: "products",
    alt: "Ridge 16 laptop",
    sizeLabel: "24.12 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-08-22",
    uploadedAtSort: "2026-08-22",
    usedIn: ["Ridge 16 laptop PDP"],
  }),
  asset({
    id: "media-hero-workbench",
    filename: "hero-workbench.svg",
    path: "/home/hero-workbench.svg",
    folder: "home",
    alt: "Hero workbench illustration",
    sizeLabel: "18.40 KB",
    dimensions: "1200 × 480",
    uploadedAt: "2026-08-20",
    uploadedAtSort: "2026-08-20",
    usedIn: ["Homepage hero"],
  }),
  asset({
    id: "media-slide-catalog",
    filename: "slide-catalog.svg",
    path: "/home/slide-catalog.svg",
    folder: "home",
    alt: "Catalog promotion slide",
    sizeLabel: "16.05 KB",
    dimensions: "960 × 540",
    uploadedAt: "2026-08-18",
    uploadedAtSort: "2026-08-18",
    usedIn: ["Homepage slider"],
  }),
  asset({
    id: "media-slide-offers",
    filename: "slide-offers.svg",
    path: "/home/slide-offers.svg",
    folder: "home",
    alt: "Offers slide",
    sizeLabel: "15.22 KB",
    dimensions: "960 × 540",
    uploadedAt: "2026-08-15",
    uploadedAtSort: "2026-08-15",
    usedIn: ["Homepage slider"],
  }),
  asset({
    id: "media-slide-builder",
    filename: "slide-builder.svg",
    path: "/home/slide-builder.svg",
    folder: "home",
    alt: "PC builder slide",
    sizeLabel: "14.80 KB",
    dimensions: "960 × 540",
    uploadedAt: "2026-08-14",
    uploadedAtSort: "2026-08-14",
    usedIn: ["Homepage slider"],
  }),
  asset({
    id: "media-promo-delivery",
    filename: "promo-delivery.svg",
    path: "/home/promo-delivery.svg",
    folder: "home",
    alt: "Delivery promo tile",
    sizeLabel: "12.10 KB",
    dimensions: "480 × 240",
    uploadedAt: "2026-08-01",
    uploadedAtSort: "2026-08-01",
    usedIn: ["Homepage promo tiles"],
  }),
  asset({
    id: "media-promo-desktop",
    filename: "promo-desktop.svg",
    path: "/home/promo-desktop.svg",
    folder: "home",
    alt: "Desktop promo tile",
    sizeLabel: "11.55 KB",
    dimensions: "480 × 240",
    uploadedAt: "2026-07-30",
    uploadedAtSort: "2026-07-30",
    usedIn: ["Homepage promo tiles"],
  }),
  asset({
    id: "media-view-27",
    filename: "view-27.svg",
    path: "/products/view-27.svg",
    folder: "products",
    alt: "View 27 monitor",
    sizeLabel: "20.40 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-07-28",
    uploadedAtSort: "2026-07-28",
    usedIn: ["View 27 monitor PDP"],
  }),
  asset({
    id: "media-view-24",
    filename: "view-24.svg",
    path: "/products/view-24.svg",
    folder: "products",
    alt: "View 24 monitor",
    sizeLabel: "19.10 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-07-27",
    uploadedAtSort: "2026-07-27",
    usedIn: ["View 24 monitor PDP"],
  }),
  asset({
    id: "media-view-43-tv",
    filename: "view-43-tv.svg",
    path: "/products/view-43-tv.svg",
    folder: "products",
    alt: "View 43 TV",
    sizeLabel: "22.00 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-07-26",
    uploadedAtSort: "2026-07-26",
    usedIn: ["View 43 TV PDP"],
  }),
  asset({
    id: "media-lumen-14",
    filename: "lumen-14.svg",
    path: "/products/lumen-14.svg",
    folder: "products",
    alt: "Lumen 14 laptop",
    sizeLabel: "23.40 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-07-20",
    uploadedAtSort: "2026-07-20",
    usedIn: ["Lumen 14 PDP"],
  }),
  asset({
    id: "media-lumen-phone",
    filename: "lumen-phone.svg",
    path: "/products/lumen-phone.svg",
    folder: "products",
    alt: "Lumen phone",
    sizeLabel: "17.60 KB",
    dimensions: "600 × 800",
    uploadedAt: "2026-07-18",
    uploadedAtSort: "2026-07-18",
    usedIn: ["Lumen phone PDP"],
  }),
  asset({
    id: "media-north-desktop",
    filename: "north-desktop.svg",
    path: "/products/north-desktop.svg",
    folder: "products",
    alt: "North desktop",
    sizeLabel: "25.10 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-07-15",
    uploadedAtSort: "2026-07-15",
    usedIn: ["North desktop PDP"],
  }),
  asset({
    id: "media-ridge-tablet",
    filename: "ridge-tablet.svg",
    path: "/products/ridge-tablet.svg",
    folder: "products",
    alt: "Ridge tablet",
    sizeLabel: "18.90 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-07-12",
    uploadedAtSort: "2026-07-12",
    usedIn: ["Ridge tablet PDP"],
  }),
  asset({
    id: "media-apex-headset",
    filename: "apex-headset.svg",
    path: "/products/apex-headset.svg",
    folder: "products",
    alt: "Apex headset",
    sizeLabel: "14.20 KB",
    dimensions: "600 × 600",
    uploadedAt: "2026-07-10",
    uploadedAtSort: "2026-07-10",
    usedIn: ["Apex headset PDP"],
  }),
  asset({
    id: "media-apex-arc",
    filename: "apex-arc.svg",
    path: "/products/apex-arc.svg",
    folder: "products",
    alt: "Apex Arc GPU",
    sizeLabel: "21.30 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-07-08",
    uploadedAtSort: "2026-07-08",
    usedIn: ["Apex Arc PDP"],
  }),
  asset({
    id: "media-volt-ddr5",
    filename: "volt-ddr5.svg",
    path: "/products/volt-ddr5.svg",
    folder: "products",
    alt: "Volt DDR5 RAM",
    sizeLabel: "9.40 KB",
    dimensions: "600 × 400",
    uploadedAt: "2026-07-05",
    uploadedAtSort: "2026-07-05",
    usedIn: ["Volt DDR5 PDP"],
  }),
  asset({
    id: "media-volt-b650",
    filename: "volt-b650.svg",
    path: "/products/volt-b650.svg",
    folder: "products",
    alt: "Volt B650 motherboard",
    sizeLabel: "13.70 KB",
    dimensions: "800 × 600",
    uploadedAt: "2026-07-03",
    uploadedAtSort: "2026-07-03",
    usedIn: ["Volt B650 PDP"],
  }),
  asset({
    id: "media-coreline-8c",
    filename: "coreline-8c.svg",
    path: "/products/coreline-8c.svg",
    folder: "products",
    alt: "Coreline 8C CPU",
    sizeLabel: "10.20 KB",
    dimensions: "600 × 600",
    uploadedAt: "2026-06-28",
    uploadedAtSort: "2026-06-28",
    usedIn: ["Coreline 8C PDP"],
  }),
  asset({
    id: "media-shell-keyboard",
    filename: "shell-keyboard.svg",
    path: "/products/shell-keyboard.svg",
    folder: "products",
    alt: "Shell keyboard",
    sizeLabel: "12.80 KB",
    dimensions: "800 × 400",
    uploadedAt: "2026-06-25",
    uploadedAtSort: "2026-06-25",
    usedIn: ["Shell keyboard PDP"],
  }),
  asset({
    id: "media-frost-cooler",
    filename: "frost-cooler.svg",
    path: "/products/frost-cooler.svg",
    folder: "products",
    alt: "Frost cooler",
    sizeLabel: "11.10 KB",
    dimensions: "600 × 600",
    uploadedAt: "2026-06-22",
    uploadedAtSort: "2026-06-22",
    usedIn: ["Frost cooler PDP"],
  }),
  asset({
    id: "media-frame-ssd",
    filename: "frame-ssd.svg",
    path: "/products/frame-ssd.svg",
    folder: "products",
    alt: "Frame SSD",
    sizeLabel: "8.90 KB",
    dimensions: "600 × 400",
    uploadedAt: "2026-06-20",
    uploadedAtSort: "2026-06-20",
    usedIn: ["Frame SSD PDP"],
  }),
  asset({
    id: "media-placeholder",
    filename: "placeholder.svg",
    path: "/products/placeholder.svg",
    folder: "products",
    alt: "Product placeholder",
    sizeLabel: "2.10 KB",
    dimensions: "400 × 400",
    uploadedAt: "2026-04-10",
    uploadedAtSort: "2026-04-10",
    usedIn: ["Fallback product image"],
  }),
  asset({
    id: "media-volt-brand",
    filename: "volt.svg",
    path: "/brands/volt.svg",
    folder: "brands",
    alt: "Volt brand logo",
    sizeLabel: "4.05 KB",
    dimensions: "160 × 48",
    uploadedAt: "2026-05-01",
    uploadedAtSort: "2026-05-01",
    usedIn: ["Brand grid", "Volt brand page"],
  }),
  asset({
    id: "media-ridge-brand",
    filename: "ridge.svg",
    path: "/brands/ridge.svg",
    folder: "brands",
    alt: "Ridge brand logo",
    sizeLabel: "3.90 KB",
    dimensions: "160 × 48",
    uploadedAt: "2026-05-01",
    uploadedAtSort: "2026-05-01",
    usedIn: ["Brand grid"],
  }),
  asset({
    id: "media-apex-brand",
    filename: "apex.svg",
    path: "/brands/apex.svg",
    folder: "brands",
    alt: "Apex brand logo",
    sizeLabel: "3.85 KB",
    dimensions: "160 × 48",
    uploadedAt: "2026-05-01",
    uploadedAtSort: "2026-05-01",
    usedIn: ["Brand grid"],
  }),
  asset({
    id: "media-lumen-brand",
    filename: "lumen.svg",
    path: "/brands/lumen.svg",
    folder: "brands",
    alt: "Lumen brand logo",
    sizeLabel: "3.70 KB",
    dimensions: "160 × 48",
    uploadedAt: "2026-04-28",
    uploadedAtSort: "2026-04-28",
    usedIn: ["Brand grid"],
  }),
  asset({
    id: "media-shell-brand",
    filename: "shell.svg",
    path: "/brands/shell.svg",
    folder: "brands",
    alt: "Shell brand logo",
    sizeLabel: "3.60 KB",
    dimensions: "160 × 48",
    uploadedAt: "2026-04-28",
    uploadedAtSort: "2026-04-28",
    usedIn: ["Brand grid"],
  }),
  asset({
    id: "media-frost-brand",
    filename: "frost.svg",
    path: "/brands/frost.svg",
    folder: "brands",
    alt: "Frost brand logo",
    sizeLabel: "3.55 KB",
    dimensions: "160 × 48",
    uploadedAt: "2026-04-27",
    uploadedAtSort: "2026-04-27",
    usedIn: ["Brand grid"],
  }),
  asset({
    id: "media-frame-brand",
    filename: "frame.svg",
    path: "/brands/frame.svg",
    folder: "brands",
    alt: "Frame brand logo",
    sizeLabel: "3.50 KB",
    dimensions: "160 × 48",
    uploadedAt: "2026-04-27",
    uploadedAtSort: "2026-04-27",
    usedIn: ["Brand grid"],
  }),
];

export function folderLabel(folder: MediaFolder): string {
  switch (folder) {
    case "products":
      return "Products";
    case "brands":
      return "Brands";
    case "categories":
      return "Categories";
    case "home":
      return "Homepage";
    case "general":
      return "General";
    case "flash-sales":
      return "Flash Sales";
    case "promotions":
      return "Promotions";
  }
}

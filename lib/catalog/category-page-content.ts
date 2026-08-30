/**
 * Bottom-of-page category SEO / buying-guide copy (demo).
 * Reference sites are IA inspiration only — original Techno House wording.
 */

export type CategoryPriceRow = {
  type: string;
  exampleLabel?: string;
  exampleHref?: string;
  deviceSupport: string;
  wattage: string;
  bestFor: string;
  priceRange: string;
};

export type CategoryBrandRow = {
  brandLabel: string;
  brandHref: string;
  bestFor: string;
  why: string;
};

export type CategoryPageContent = {
  /** Short category name for crumbs / meta title. */
  listingTitle: string;
  /** Toolbar H1, e.g. "Wireless Charger Price in Bangladesh". */
  priceHeaderTitle?: string;
  /** Meta description. */
  description: string;
  /** SEO headline before the brand accent (e.g. "Buy Fast & Compatible Wireless Chargers"). */
  seoHeadline: string;
  seoParagraphs: string[];
  priceRangeTitle?: string;
  priceRangeSubtitle?: string;
  priceRows?: CategoryPriceRow[];
  priceNote?: string;
  brandsTitle?: string;
  brandsSubtitle?: string;
  brandRows?: CategoryBrandRow[];
  /** Optional intro video under the SEO band. */
  videoYoutubeId?: string;
};

const DEMO_VIDEO = {
  tech: "aqz-KE-bpKQ",
};

function defaultContent(name: string): CategoryPageContent {
  return {
    listingTitle: name,
    priceHeaderTitle: `${name} Price in Bangladesh`,
    description: `Shop ${name} at Techno House. Compare specs, warranty, and stock. Prices in ৳ are display-only.`,
    seoHeadline: `Shop ${name}`,
    seoParagraphs: [
      `Browse ${name} at Techno House with clear specs, warranty labels, and stock status on every card. Filter by brand and attributes to narrow the list.`,
      `Prices in ৳ are for display in this demo build and are not a charge. Always confirm the latest price and availability on the product page before you buy.`,
    ],
    priceNote: `Note: ${name} prices may change based on stock, brand, warranty, offer, and product availability. Always check the latest price before buying.`,
  };
}

const BY_SLUG: Record<string, CategoryPageContent> = {
  "wireless-charger": {
    listingTitle: "Wireless Charger",
    priceHeaderTitle: "Wireless Charger Price in Bangladesh",
    description:
      "Buy compatible wireless chargers at Techno House. Compare wattage, placement, and device support. Prices in ৳ are display-only.",
    seoHeadline: "Buy Fast & Compatible Wireless Chargers",
    seoParagraphs: [
      "Wireless chargers let you power Qi-supported phones and earbuds without plugging in every time. At Techno House you can compare pads, stands, and multi-coil models by wattage, placement style, and device support before you add to cart.",
      "Whether you need a slim desk pad or an upright stand for notifications, check power rating, input type, and warranty on each product. Specs and prices in ৳ are demo catalog data.",
    ],
    priceRangeTitle: "Wireless Charger Price Range in Bangladesh",
    priceRangeSubtitle:
      "Compare wireless charger types by device support, wattage, placement style, and use case.",
    priceRows: [
      {
        type: "Basic Wireless Charging Pad",
        exampleLabel: "Volt Pad15 Wireless Charger",
        exampleHref: "/product/volt-pad15-wireless-charger",
        deviceSupport: "Qi-supported iPhone, Samsung, and Android phones.",
        wattage: "5W, 10W, or 15W",
        bestFor: "Desk, bedside table, and regular phone charging.",
        priceRange: "900 – 1,500 BDT",
      },
      {
        type: "Stand / Vertical Charger",
        exampleLabel: "Volt Duo Stand Charger",
        exampleHref: "/product/volt-duo-stand-charger",
        deviceSupport: "Phones that charge while upright; some support buds cases.",
        wattage: "10W – 20W shared",
        bestFor: "Nightstand and desk use when you want the screen visible.",
        priceRange: "2,000 – 4,000 BDT",
      },
      {
        type: "Multi-device / Mag-style Pad",
        exampleLabel: "Volt Pad15 Wireless Charger",
        exampleHref: "/product/volt-pad15-wireless-charger",
        deviceSupport: "Mag-compatible phones and Qi pads with alignment ring.",
        wattage: "15W class",
        bestFor: "Faster top-up and cleaner cable management at the desk.",
        priceRange: "2,500 – 5,500 BDT",
      },
    ],
    priceNote:
      "Note: Wireless charger prices may change based on stock, brand, warranty, offer, adapter support, and product availability. Always check the latest price before buying.",
    brandsTitle: "Popular Wireless Charger Brands at Techno House",
    brandsSubtitle:
      "Choose a brand based on your device ecosystem, placement preference, charging speed, and budget.",
    brandRows: [
      {
        brandLabel: "Volt Wireless Charger",
        brandHref: "/brand/volt",
        bestFor: "Everyday pads and dual stands",
        why: "Straightforward wattage labels and USB-C input options for desk setups in the demo catalog.",
      },
      {
        brandLabel: "Shell Accessories",
        brandHref: "/brand/shell",
        bestFor: "Cables that pair with charging pads",
        why: "USB-C cables sized for pad power delivery; useful when your pack does not include a wall adapter.",
      },
      {
        brandLabel: "Apex Mobile Gear",
        brandHref: "/brand/apex",
        bestFor: "Phone-adjacent accessories",
        why: "Pairs well when you are building a mobile desk kit alongside gaming and phone categories.",
      },
    ],
    videoYoutubeId: DEMO_VIDEO.tech,
  },
  accessories: {
    listingTitle: "Accessories",
    priceHeaderTitle: "Accessories Price in Bangladesh",
    description:
      "Cables, chargers, and everyday add-ons at Techno House. Prices in ৳ are display-only.",
    seoHeadline: "Shop Tech Accessories",
    seoParagraphs: [
      "From wireless chargers to USB-C cables, Accessories covers the everyday add-ons that finish a phone or laptop setup. Open a subcategory to focus the grid, then compare brand, stock, and warranty on each card.",
      "Demo prices in ৳ help you plan a basket; nothing is charged in this build.",
    ],
    priceRangeTitle: "Accessories Price Range in Bangladesh",
    priceRangeSubtitle:
      "Typical demo ranges by accessory type — confirm live stock on each product.",
    priceRows: [
      {
        type: "Wireless charger",
        exampleLabel: "Volt Pad15",
        exampleHref: "/product/volt-pad15-wireless-charger",
        deviceSupport: "Qi phones and compatible buds cases.",
        wattage: "5W – 20W",
        bestFor: "Desk and bedside charging.",
        priceRange: "900 – 4,000 BDT",
      },
      {
        type: "USB-C cable",
        exampleLabel: "Shell USB-C Cable 1m",
        exampleHref: "/product/shell-usb-c-cable",
        deviceSupport: "Phones, pads, and many laptops within rating.",
        wattage: "Up to 60W",
        bestFor: "Powering pads and daily top-ups.",
        priceRange: "500 – 1,200 BDT",
      },
    ],
    priceNote:
      "Note: Accessory prices may change based on stock, brand, warranty, offer, and availability. Always check the latest price before buying.",
    brandsTitle: "Popular Accessory Brands at Techno House",
    brandsSubtitle:
      "Pick a brand for charging speed, cable quality, and how it fits your device kit.",
    brandRows: [
      {
        brandLabel: "Volt",
        brandHref: "/brand/volt",
        bestFor: "Chargers and power accessories",
        why: "Clear power labels on wireless pads and stands in the demo catalog.",
      },
      {
        brandLabel: "Shell",
        brandHref: "/brand/shell",
        bestFor: "Cables and cases",
        why: "Braided USB-C options that pair with charging pads and laptops.",
      },
    ],
    videoYoutubeId: DEMO_VIDEO.tech,
  },
  cables: {
    listingTitle: "Cables & Adapters",
    priceHeaderTitle: "Cables & Adapters Price in Bangladesh",
    description:
      "USB-C and related cables at Techno House. Prices in ৳ are display-only.",
    seoHeadline: "Buy Reliable Cables & Adapters",
    seoParagraphs: [
      "Cables connect chargers, phones, and laptops. Compare length, power rating, and connector type before you buy.",
      "Demo catalog prices in ৳ are display-only and may change with stock.",
    ],
    priceRangeTitle: "Cable Price Range in Bangladesh",
    priceRangeSubtitle: "Compare length and power delivery for everyday desk use.",
    priceRows: [
      {
        type: "USB-C to USB-C (1m)",
        exampleLabel: "Shell USB-C Cable 1m",
        exampleHref: "/product/shell-usb-c-cable",
        deviceSupport: "Phones, pads, and laptops within 60W.",
        wattage: "Up to 60W",
        bestFor: "Charging pads and daily carry.",
        priceRange: "500 – 1,200 BDT",
      },
    ],
    priceNote:
      "Note: Cable prices may change based on stock, brand, and length. Always check the latest price before buying.",
    brandsTitle: "Popular Cable Brands at Techno House",
    brandsSubtitle: "Choose by durability, length, and power rating.",
    brandRows: [
      {
        brandLabel: "Shell",
        brandHref: "/brand/shell",
        bestFor: "Braided USB-C desk cables",
        why: "Straightforward power and length labeling in the demo catalog.",
      },
    ],
  },
  phones: {
    listingTitle: "Mobile phones",
    priceHeaderTitle: "Mobile Phone Price in Bangladesh",
    description:
      "Smartphones at Techno House. Compare storage and display. Prices in ৳ are display-only.",
    seoHeadline: "Buy Mobile Phones",
    seoParagraphs: [
      "Compare smartphones by storage, display size, and warranty. Pair with Accessories for wireless chargers and cables.",
      "Prices in ৳ are demo display values — confirm on the product page before you buy.",
    ],
    priceRangeTitle: "Mobile Phone Price Range in Bangladesh",
    priceRangeSubtitle: "Demo ranges by use case — not a live market index.",
    priceRows: [
      {
        type: "Everyday smartphone",
        deviceSupport: "Calls, messaging, and daily apps.",
        wattage: "—",
        bestFor: "Students and general use.",
        priceRange: "15,000 – 35,000 BDT",
      },
      {
        type: "Mid-range / feature phone kit",
        deviceSupport: "Larger storage and brighter displays.",
        wattage: "—",
        bestFor: "Work and media on the go.",
        priceRange: "35,000 – 70,000 BDT",
      },
    ],
    priceNote:
      "Note: Phone prices may change based on stock, brand, warranty, offer, and availability. Always check the latest price before buying.",
    brandsTitle: "Popular Phone Brands at Techno House",
    brandsSubtitle: "Choose by ecosystem, camera needs, and budget.",
    brandRows: [
      {
        brandLabel: "Lumen",
        brandHref: "/brand/lumen",
        bestFor: "Balanced everyday phones",
        why: "Clear storage and display specs on listing cards in the demo catalog.",
      },
      {
        brandLabel: "Ridge",
        brandHref: "/brand/ridge",
        bestFor: "Performance-oriented picks",
        why: "Pairs with gaming and accessory categories when you build a full kit.",
      },
    ],
    videoYoutubeId: DEMO_VIDEO.tech,
  },
  laptops: {
    listingTitle: "Laptops",
    priceHeaderTitle: "Laptop Price in Bangladesh",
    description:
      "Laptops for work and study at Techno House. Prices in ৳ are display-only.",
    seoHeadline: "Buy Laptops for Work & Study",
    seoParagraphs: [
      "Browse notebooks by processor, memory, and storage. Spec chips on each card make side-by-side comparison faster.",
      "Demo prices in ৳ help you plan — nothing is charged in this build.",
    ],
    priceRangeTitle: "Laptop Price Range in Bangladesh",
    priceRangeSubtitle: "Typical demo bands by use case.",
    priceRows: [
      {
        type: "Office / study notebook",
        deviceSupport: "Documents, browsing, and video calls.",
        wattage: "—",
        bestFor: "Campus and office desks.",
        priceRange: "55,000 – 90,000 BDT",
      },
      {
        type: "Creator / higher RAM",
        deviceSupport: "Light creative apps and multitasking.",
        wattage: "—",
        bestFor: "Students and freelancers.",
        priceRange: "90,000 – 150,000 BDT",
      },
    ],
    priceNote:
      "Note: Laptop prices may change based on stock, brand, warranty, offer, and configuration. Always check the latest price before buying.",
    brandsTitle: "Popular Laptop Brands at Techno House",
    brandsSubtitle: "Choose by build quality, keyboard feel, and service coverage.",
    brandRows: [
      {
        brandLabel: "Lumen",
        brandHref: "/brand/lumen",
        bestFor: "Office-ready notebooks",
        why: "Balanced specs for everyday work in the demo catalog.",
      },
      {
        brandLabel: "Ridge",
        brandHref: "/brand/ridge",
        bestFor: "Gaming-leaning machines",
        why: "Higher refresh and graphics options under related categories.",
      },
    ],
    videoYoutubeId: DEMO_VIDEO.tech,
  },
  "gaming-laptops": {
    listingTitle: "Gaming laptops",
    description:
      "Gaming laptops at Techno House. Prices in ৳ are display-only.",
    seoHeadline: "Buy Gaming Laptops",
    seoParagraphs: [
      "Higher-refresh displays and dedicated graphics for games and creative apps. Check stock and warranty on each card.",
      "Prices in ৳ are display-only demo values.",
    ],
    priceNote:
      "Note: Gaming laptop prices may change based on stock, GPU tier, and offers. Always check the latest price before buying.",
  },
  monitors: {
    listingTitle: "Monitors",
    description: "Monitors at Techno House. Prices in ৳ are display-only.",
    seoHeadline: "Buy Computer Monitors",
    seoParagraphs: [
      "IPS and related panels for office and creative desks. Filter by size and panel type on the listing.",
      "Demo prices in ৳ are not a charge.",
    ],
    priceRangeTitle: "Monitor Price Range in Bangladesh",
    priceRangeSubtitle: "Demo ranges by size and use case.",
    priceRows: [
      {
        type: "24–27″ office IPS",
        deviceSupport: "HDMI / DisplayPort desktops and laptops.",
        wattage: "—",
        bestFor: "Work and study desks.",
        priceRange: "12,000 – 28,000 BDT",
      },
    ],
    priceNote:
      "Note: Monitor prices may change based on stock, panel type, and offers. Always check the latest price before buying.",
    brandsTitle: "Popular Monitor Brands at Techno House",
    brandsSubtitle: "Choose by panel type, size, and refresh needs.",
    brandRows: [
      {
        brandLabel: "View",
        brandHref: "/brand/view",
        bestFor: "Office IPS panels",
        why: "Clear size and panel labels on listing cards.",
      },
    ],
  },
  gaming: {
    listingTitle: "Gaming gear",
    description: "Gaming accessories at Techno House. Prices in ৳ are display-only.",
    seoHeadline: "Shop Gaming Gear",
    seoParagraphs: [
      "Headsets, keyboards, and related gear for gaming desks. Specs are demo catalog data.",
      "Confirm stock and warranty on each product before you buy.",
    ],
    priceNote:
      "Note: Gaming gear prices may change based on stock, brand, and offers. Always check the latest price before buying.",
    brandsTitle: "Popular Gaming Brands at Techno House",
    brandsSubtitle: "Choose by form factor, switch type, and desk layout.",
    brandRows: [
      {
        brandLabel: "Apex",
        brandHref: "/brand/apex",
        bestFor: "Headsets and controllers",
        why: "Straightforward connection and type labels in the demo catalog.",
      },
      {
        brandLabel: "Shell",
        brandHref: "/brand/shell",
        bestFor: "Keyboards",
        why: "Compact layouts that leave room for a mouse.",
      },
    ],
    videoYoutubeId: DEMO_VIDEO.tech,
  },
  components: {
    listingTitle: "PC components",
    description: "PC components at Techno House. Prices in ৳ are display-only.",
    seoHeadline: "Buy PC Components",
    seoParagraphs: [
      "Processors, boards, memory, graphics, storage, power, and cases. Use PC Builder for slot-by-slot notes.",
      "Demo prices in ৳ help you plan a build — nothing is charged here.",
    ],
    priceNote:
      "Note: Component prices may change based on stock, generation, and offers. Always check the latest price before buying.",
  },
};

const SIMPLE_SLUGS: Record<
  string,
  Partial<CategoryPageContent> & { listingTitle?: string }
> = {
  desktops: { listingTitle: "Desktop PCs", seoHeadline: "Buy Desktop PCs" },
  servers: { listingTitle: "Servers", seoHeadline: "Shop Servers" },
  "pcs-servers": { listingTitle: "PC and Server", seoHeadline: "Shop PC & Server" },
  cpu: { listingTitle: "Processors", seoHeadline: "Buy Processors (CPU)" },
  "cpu-coolers": { listingTitle: "CPU Coolers", seoHeadline: "Buy CPU Coolers" },
  motherboards: { listingTitle: "Motherboards", seoHeadline: "Buy Motherboards" },
  ram: { listingTitle: "Memory (RAM)", seoHeadline: "Buy Memory (RAM)" },
  "graphics-cards": {
    listingTitle: "Graphics cards",
    seoHeadline: "Buy Graphics Cards",
    videoYoutubeId: DEMO_VIDEO.tech,
  },
  ssd: { listingTitle: "SSD", seoHeadline: "Buy SSDs" },
  hdd: { listingTitle: "HDD", seoHeadline: "Buy Hard Drives" },
  psu: { listingTitle: "Power supplies", seoHeadline: "Buy Power Supplies" },
  cases: { listingTitle: "PC cases", seoHeadline: "Buy PC Cases" },
  "case-fans": { listingTitle: "Case fans", seoHeadline: "Buy Case Fans" },
  tablets: { listingTitle: "Tablets", seoHeadline: "Buy Tablets" },
  tvs: { listingTitle: "Televisions", seoHeadline: "Buy Televisions" },
  gadgets: { listingTitle: "Gadgets", seoHeadline: "Shop Gadgets" },
  printers: { listingTitle: "Printers", seoHeadline: "Buy Printers" },
  cameras: { listingTitle: "Cameras", seoHeadline: "Buy Cameras" },
  security: { listingTitle: "Security", seoHeadline: "Shop Security Gear" },
  networking: { listingTitle: "Networking", seoHeadline: "Shop Networking" },
  routers: { listingTitle: "Routers", seoHeadline: "Buy Routers" },
  switches: { listingTitle: "Switches", seoHeadline: "Buy Network Switches" },
  sound: { listingTitle: "Sound & audio", seoHeadline: "Shop Sound & Audio" },
  office: { listingTitle: "Office items", seoHeadline: "Shop Office Items" },
  software: { listingTitle: "Software", seoHeadline: "Shop Software" },
  appliances: { listingTitle: "Appliances", seoHeadline: "Shop Appliances" },
};

export function getCategoryPageContent(
  slug: string,
  name: string,
): CategoryPageContent {
  const rich = BY_SLUG[slug];
  if (rich) {
    return rich;
  }

  const partial = SIMPLE_SLUGS[slug];
  const base = defaultContent(name);
  if (!partial) {
    return base;
  }

  return {
    ...base,
    listingTitle: partial.listingTitle ?? name,
    priceHeaderTitle:
      partial.priceHeaderTitle ??
      `${partial.listingTitle ?? name} Price in Bangladesh`,
    seoHeadline: partial.seoHeadline ?? base.seoHeadline,
    description: partial.description ?? base.description,
    videoYoutubeId: partial.videoYoutubeId,
    seoParagraphs: partial.seoParagraphs ?? [
      `${partial.seoHeadline ?? `Shop ${name}`} at Techno House. Compare specs, warranty, and stock on each product card.`,
      "Prices in ৳ are for display in this demo build and are not a charge. Confirm the latest price on the product page before you buy.",
    ],
    priceNote:
      partial.priceNote ??
      `Note: ${name} prices may change based on stock, brand, warranty, offer, and product availability. Always check the latest price before buying.`,
  };
}

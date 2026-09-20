/**
 * One-time category taxonomy rebuild — replaces the old ad-hoc category
 * tree with the Star Tech-style structure in
 * `docs/startech-main-nav-structure.md`, "same to same" except brand names.
 *
 * Every node in that doc that is actually a brand list (AMD/Intel under
 * Processor, Acer/ASUS/Dell/... under Brand PC, etc.) is deliberately left
 * out — this store already has a real Brand entity + brand filters
 * (mega-menu's brand flyout, /brand/[slug], category listing brand facet),
 * so re-declaring every brand as its own Category row would duplicate that
 * system and blow up the category count for no benefit. What's kept is the
 * genuine category/product-type hierarchy.
 *
 *   npm run catalog:rebuild-taxonomy          # apply
 *   npm run catalog:rebuild-taxonomy -- --dry-run   # report only, no writes
 *
 * Steps, in order:
 *   1. Create every new category (two passes: rows first, then parent
 *      links — same pattern as create-catalog-categories.ts).
 *   2. Reassign every product currently on an OLD category to its mapped
 *      NEW category (OLD_TO_NEW below).
 *   3. Delete the old categories. Product.categoryId has no explicit
 *      onDelete (Postgres default = RESTRICT), so this step fails loudly
 *      instead of orphaning/deleting products if step 2 missed anything —
 *      that failure is the safety net, not a bug to work around.
 *
 * Idempotent: safe to re-run. Step 1 upserts by slug; steps 2-3 are no-ops
 * once the old categories are empty/gone.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

type TreeNode = {
  name: string;
  slug?: string;
  filterKeys?: string[];
  children?: TreeNode[];
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// New tree (docs/startech-main-nav-structure.md, brand leaves removed)
// ---------------------------------------------------------------------------
const NEW_CATALOG_TREE: TreeNode[] = [
  {
    name: "Desktop",
    children: [
      { name: "AI PC" },
      { name: "Desktop Offer" },
      {
        name: "Star PC",
        children: [
          { name: "Intel PC", slug: "star-pc-intel" },
          { name: "Ryzen PC", slug: "star-pc-ryzen" },
        ],
      },
      {
        name: "Gaming PC",
        children: [
          { name: "Intel PC", slug: "gaming-pc-intel" },
          { name: "Ryzen PC", slug: "gaming-pc-ryzen" },
        ],
      },
      { name: "Brand PC" },
      { name: "All-in-One PC" },
      { name: "Portable Mini PC" },
      { name: "Apple Mac Mini" },
      { name: "Apple iMac" },
      { name: "Apple Mac Studio" },
      { name: "Apple Mac Pro" },
    ],
  },
  {
    name: "Laptop",
    children: [
      { name: "All Laptop", filterKeys: ["processor", "ram", "storage"] },
      {
        name: "Gaming Laptop",
        filterKeys: ["processor", "ram", "storage", "graphics"],
      },
      { name: "Premium Ultrabook" },
      { name: "Laptop Bag" },
      {
        name: "Laptop Accessories",
        children: [
          { name: "Laptop Cooler" },
          { name: "Laptop Desk" },
          { name: "Laptop RAM" },
          { name: "Laptop Stand" },
          { name: "Laptop Battery" },
          { name: "Laptop Charger / Adapter" },
          { name: "Display" },
          { name: "Laptop Keyboard" },
          { name: "Caddy" },
        ],
      },
    ],
  },
  {
    name: "Component",
    children: [
      { name: "Processor", filterKeys: ["socket", "cores"] },
      { name: "CPU Cooler", filterKeys: ["coolerType"] },
      { name: "Motherboard", filterKeys: ["socket", "formFactor", "ramType"] },
      { name: "Graphics Card", filterKeys: ["memory"] },
      { name: "RAM (Desktop)", filterKeys: ["ramType", "capacity"] },
      { name: "RAM (Laptop)", filterKeys: ["ramType", "capacity"] },
      { name: "Power Supply", filterKeys: ["wattage"] },
      { name: "Hard Disk Drive", filterKeys: ["capacity"] },
      { name: "Portable Hard Disk Drive", filterKeys: ["capacity"] },
      { name: "SSD", filterKeys: ["capacity"] },
      { name: "Portable SSD", filterKeys: ["capacity"] },
      { name: "Casing", filterKeys: ["formFactor"] },
      { name: "Casing Cooler", filterKeys: ["size"] },
      { name: "Optical Disk Drive" },
      { name: "Vertical GPU Holder" },
      { name: "Water / Liquid Cooling" },
    ],
  },
  {
    name: "Monitor",
    filterKeys: ["size", "panel"],
    children: [
      { name: "Gaming Monitor" },
      { name: "Curved Monitor" },
      { name: "Touch Monitor" },
      { name: "4K Monitor" },
      { name: "Portable Monitor" },
      { name: "Monitor Arm" },
    ],
  },
  {
    name: "Power",
    children: [
      { name: "UPS" },
      { name: "Online UPS" },
      { name: "Mini UPS" },
      { name: "Portable Power Station" },
      { name: "IPS" },
      { name: "UPS Battery" },
      { name: "Voltage Stabilizer" },
      { name: "Inverter" },
      { name: "Solar Panel" },
    ],
  },
  {
    name: "Phone",
    filterKeys: ["storage"],
    children: [
      { name: "Feature Phone" },
      {
        name: "Mobile Accessories",
        children: [
          { name: "Charger Adapter" },
          { name: "Car Charger" },
          { name: "Type-C Cable" },
          { name: "Micro USB Cable" },
          { name: "Lightning Cable" },
          { name: "Holder & Stand" },
          { name: "Case & Cover" },
          { name: "Mobile Phone Cooler" },
          // Not in the reference doc's Phone section, but the old catalog
          // had a real "Wireless Charger" category with real products —
          // the closest honest home for it in the new tree.
          { name: "Wireless Charger" },
        ],
      },
    ],
  },
  {
    name: "Tablet",
    filterKeys: ["storage"],
    children: [{ name: "Graphics Tablet" }, { name: "Stylus Pen" }],
  },
  {
    name: "Office Equipment",
    children: [
      {
        name: "Projector",
        children: [{ name: "Projection Screen" }, { name: "Projector Mount" }],
      },
      { name: "Conference System" },
      { name: "PA System" },
      { name: "Interactive Flat Panel" },
      { name: "Video Wall" },
      { name: "Signage" },
      { name: "Kiosk" },
      { name: "Printer" },
      { name: "Laser Printer" },
      { name: "Large Format Printer" },
      { name: "ID Card Printer" },
      { name: "POS Printer" },
      { name: "Label Printer" },
      {
        name: "Photocopier",
        filterKeys: ["printTechnology", "function", "printColor", "paperSize", "duplex"],
      },
      { name: "Toner" },
      { name: "Cartridge" },
      { name: "Ink Bottle" },
      { name: "Printer Paper" },
      { name: "Ribbon" },
      { name: "Printer Drum" },
      { name: "Scanner" },
      { name: "Barcode Scanner" },
      { name: "Cash Drawer" },
      { name: "Telephone Set" },
      { name: "IP Phone" },
      { name: "PABX System" },
      { name: "Money Counting Machine" },
      { name: "Paper Shredder" },
      { name: "Laminating Machine" },
      { name: "Binding Machine" },
    ],
  },
  {
    name: "Camera",
    children: [
      {
        name: "Action Camera",
        children: [{ name: "Action Camera Accessories" }],
      },
      { name: "DSLR" },
      { name: "Mirrorless Camera" },
      { name: "Digital Camera" },
      { name: "Video Camera" },
      { name: "Handycam" },
      { name: "Dash Cam" },
      { name: "Instant Camera" },
      { name: "Body Camera" },
      { name: "Camera Lenses" },
      { name: "Camera Tripod" },
      {
        name: "Camera Accessories",
        children: [
          { name: "Camera Flash" },
          { name: "Studio Light" },
          { name: "Softbox" },
          { name: "Lens Filter" },
          { name: "Lens Adapter" },
          { name: "Battery & Charger" },
          { name: "Camera Bag" },
          { name: "Dry Cabinet" },
          { name: "Camera Flash Trigger" },
        ],
      },
      { name: "Gimbal" },
    ],
  },
  {
    name: "Security",
    children: [
      { name: "Portable WiFi Camera" },
      {
        name: "IP Camera",
        filterKeys: ["resolution", "cameraType", "connectivity", "nightVision"],
      },
      { name: "CC Camera" },
      { name: "PTZ Camera" },
      { name: "CC Camera Package" },
      { name: "IP Camera Package" },
      { name: "DVR" },
      { name: "NVR" },
      { name: "XVR" },
      { name: "CC Camera Accessories" },
      { name: "Door Lock" },
      { name: "Smart Door Bell" },
      {
        name: "Access Control",
        children: [{ name: "Access Control Accessories" }],
      },
      { name: "Entrance Control" },
      { name: "Digital Locker & Vault" },
      { name: "KVM Switch" },
    ],
  },
  {
    name: "Networking",
    children: [
      { name: "Starlink" },
      { name: "Router" },
      { name: "Pocket Router" },
      { name: "WiFi Range Extender" },
      { name: "Access Point" },
      { name: "WiFi Adapter" },
      { name: "Network Switch" },
      { name: "Firewall" },
      { name: "ONU" },
      { name: "OLT" },
      { name: "Media Converter" },
      { name: "Network Transceivers" },
      {
        name: "Networking Cable",
        children: [{ name: "UTP Cable" }, { name: "Fiber Optic Cable" }],
      },
      { name: "Patch Cord" },
      { name: "Connector" },
      { name: "Modular Jack" },
      { name: "Faceplate" },
      { name: "Patch Panel" },
      { name: "LAN Card" },
      { name: "PoE Injector" },
      { name: "Crimping Tool" },
      { name: "Splicer Machine" },
      { name: "Cable Tester" },
    ],
  },
  {
    name: "Software",
    children: [
      { name: "Operating System", filterKeys: ["licenseType", "platform"] },
      { name: "Office Application" },
      { name: "Database Server Solution" },
      { name: "Mail Server Solution" },
      { name: "Cloud Solutions" },
      {
        name: "Antivirus",
        children: [{ name: "For Home User" }, { name: "For Business Users" }],
      },
      { name: "Bangla Typing Software" },
      { name: "Adobe" },
      { name: "VMware" },
      { name: "AutoDesk" },
      { name: "AnyDesk" },
    ],
  },
  {
    name: "Server & Storage",
    children: [
      {
        name: "Server",
        filterKeys: ["processor", "ram", "storage", "formFactor", "raid"],
      },
      { name: "GPU Server" },
      { name: "Server Rack" },
      { name: "Workstation" },
      { name: "NAS Storage" },
      { name: "SAN Storage" },
      { name: "DAS Storage" },
      { name: "Server HDD" },
      { name: "Server HDD Bay" },
      { name: "Server RAM" },
      { name: "Server SSD" },
      { name: "Server Power Supply" },
    ],
  },
  {
    name: "Accessories",
    children: [
      { name: "Watch" },
      { name: "Keyboard" },
      { name: "Mouse" },
      {
        name: "Headphone",
        filterKeys: ["audioType", "connectivity", "microphone"],
      },
      { name: "Bluetooth Headphone" },
      { name: "Mouse Pad" },
      { name: "Wrist Rest" },
      { name: "Headphone Stand" },
      { name: "Speaker & Home Theater" },
      { name: "Bluetooth Speakers" },
      { name: "Soundbar" },
      { name: "Webcam" },
      {
        name: "Cable",
        children: [
          { name: "USB Cable" },
          { name: "Audio Cable" },
          { name: "HDMI Cable" },
          { name: "VGA Cable" },
          { name: "DisplayPort Cable" },
          { name: "Printer Cable" },
          { name: "Cable Organizer" },
        ],
      },
      {
        name: "Converter",
        children: [
          { name: "USB Converter" },
          { name: "Audio Converter" },
          { name: "Type-C Converter" },
          { name: "HDMI Converter" },
          { name: "VGA Converter" },
          { name: "DisplayPort Converter" },
          { name: "DVI Converter" },
        ],
      },
      { name: "Card Reader" },
      { name: "Hubs & Docks" },
      { name: "Microphone" },
      { name: "Digital Voice Recorder" },
      { name: "Presenter" },
      { name: "Memory Card" },
      { name: "Capture Card" },
      { name: "Pen Drive" },
      { name: "Thermal Paste" },
      { name: "HDD-SSD Enclosure" },
      { name: "Power Strip" },
      { name: "Bluetooth Adapter" },
      { name: "Monitor Light Bar" },
    ],
  },
  {
    name: "Gadget",
    children: [
      {
        name: "Daily Lifestyle",
        children: [
          { name: "Blood Pressure Monitor" },
          { name: "Weight Scale" },
          { name: "Hair Dryer" },
          { name: "Hair Straightener" },
          { name: "Electric Toothbrush" },
          { name: "GPS Tracker" },
          { name: "Mosquito Bat" },
          { name: "Torch Light" },
          { name: "Table Lamp" },
          { name: "Massage Gun" },
        ],
      },
      { name: "Smart Watch" },
      { name: "Smart Band" },
      { name: "Analog Watch" },
      { name: "Earphone" },
      { name: "Earbuds" },
      { name: "Neckband" },
      { name: "Trimmer" },
      { name: "Smart Ring" },
      { name: "Smart Glasses" },
      { name: "Power Bank" },
      { name: "Mini Fan" },
      { name: "Health Monitor" },
      {
        name: "Studio Equipment",
        children: [
          { name: "Studio Microphones" },
          { name: "Studio Monitors" },
          { name: "Studio Headphones" },
          { name: "Audio Interfaces" },
          { name: "Switcher" },
        ],
      },
      {
        name: "Drones",
        children: [
          { name: "Mini Toy Drone" },
          { name: "4K Drone" },
          { name: "Professional Drone" },
          { name: "Enterprise Drone" },
          { name: "Drone Accessories" },
        ],
      },
      { name: "Calculator" },
      {
        name: "Power Tools",
        children: [
          { name: "Blower Machine" },
          { name: "Drill Machine" },
          { name: "Angle Grinder" },
          { name: "Screwdriver" },
          { name: "Saw Machine" },
          { name: "Sander Machine" },
        ],
      },
    ],
  },
  {
    name: "Gaming",
    children: [
      { name: "Gaming Chair" },
      { name: "Gaming Desk" },
      { name: "Gaming Console" },
      { name: "Gamepad" },
      { name: "Racing Wheel" },
      { name: "VR" },
      { name: "Games" },
      { name: "Gaming Router" },
    ],
  },
  {
    name: "TV",
    filterKeys: ["size"],
    children: [
      { name: "All TV" },
      { name: "LED TV" },
      { name: "Smart TV" },
      { name: "Android TV" },
      { name: "4K TV" },
      { name: "TV Box" },
      { name: "TV Stand & Wall Mount" },
    ],
  },
  {
    name: "Appliance",
    children: [
      { name: "AC" },
      { name: "Air Fryer" },
      { name: "Washing Machine" },
      { name: "Fridge", children: [{ name: "Deep Freezer" }] },
      { name: "Geyser" },
      { name: "Light" },
      { name: "Room Heater" },
      { name: "Air Purifier" },
      { name: "Coffee Maker" },
      {
        name: "Fan",
        children: [
          { name: "Charger Fan" },
          { name: "Ceiling Fan" },
          { name: "Stand Fan" },
        ],
      },
      { name: "Dishwasher" },
      { name: "Vacuum Cleaner" },
      { name: "Dehumidifier" },
      { name: "Electric Cooker" },
      { name: "Induction Cooker" },
      { name: "Oven" },
      { name: "Blender & Grinder" },
      {
        name: "Cooker",
        children: [{ name: "Rice Cooker" }, { name: "Pressure Cooker" }],
      },
      { name: "Kitchen Hood" },
      { name: "Juicer" },
      { name: "Toaster" },
      { name: "Sewing Machine" },
      { name: "Iron" },
      { name: "Electric Kettle" },
      { name: "Air Cooler" },
      { name: "Air Curtain" },
      { name: "Gas Stove" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Old slug -> new slug. Every product on the old slug is moved to the new
// one; the old category is then deleted (see file header for why that's
// safe). Old slugs not listed here (or not present in this DB) are ignored.
// ---------------------------------------------------------------------------
const OLD_TO_NEW: Record<string, string> = {
  laptops: "all-laptop",
  "gaming-laptops": "gaming-laptop",
  "pcs-servers": "desktop",
  desktops: "star-pc",
  servers: "server",
  components: "component",
  cpu: "processor",
  "cpu-coolers": "cpu-cooler",
  motherboards: "motherboard",
  ram: "ram-desktop",
  "graphics-cards": "graphics-card",
  ssd: "ssd",
  hdd: "hard-disk-drive",
  psu: "power-supply",
  cases: "casing",
  "case-fans": "casing-cooler",
  gaming: "gaming",
  monitors: "monitor",
  tvs: "all-tv",
  tablets: "tablet",
  phones: "phone",
  gadgets: "gadget",
  printers: "printer",
  cameras: "camera",
  security: "security",
  networking: "networking",
  routers: "router",
  switches: "network-switch",
  sound: "speaker-and-home-theater",
  office: "office-equipment",
  accessories: "accessories",
  "wireless-charger": "wireless-charger",
  cables: "cable",
  software: "software",
  appliances: "appliance",
  // Stray category seen in some environments, not part of the canonical old
  // tree (lib/data/mocks/catalog.ts) — mapped defensively so it doesn't
  // block cleanup if present.
  notebook: "all-laptop",
};

type FlatCategory = {
  slug: string;
  name: string;
  parentSlug: string | null;
  filterKeys: string[];
  position: number;
};

function flatten(nodes: TreeNode[], parentSlug: string | null): FlatCategory[] {
  const out: FlatCategory[] = [];
  let position = 0;
  function walk(list: TreeNode[], parent: string | null) {
    for (const node of list) {
      const slug = node.slug ?? slugify(node.name);
      out.push({
        slug,
        name: node.name,
        parentSlug: parent,
        filterKeys: node.filterKeys ?? [],
        position: position++,
      });
      if (node.children) {
        walk(node.children, slug);
      }
    }
  }
  walk(nodes, parentSlug);
  return out;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrisma();
  const flat = flatten(NEW_CATALOG_TREE, null);

  // Sanity check: every slug must be unique before touching the database.
  const seen = new Map<string, number>();
  for (const row of flat) {
    seen.set(row.slug, (seen.get(row.slug) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    console.error(
      "Duplicate slugs in the new tree — fix before running:",
      duplicates.map(([slug]) => slug),
    );
    process.exitCode = 1;
    return;
  }

  console.log(`New tree: ${flat.length} categories.`);

  if (dryRun) {
    const existingOld = await prisma.category.findMany({
      where: { slug: { in: Object.keys(OLD_TO_NEW) } },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: true } },
      },
    });
    console.log("\nOld categories found in this database:");
    for (const row of existingOld) {
      const target = OLD_TO_NEW[row.slug];
      const note = target === row.slug ? " (unchanged, kept as-is)" : "";
      console.log(
        `  ${row.slug} (${row._count.products} products) -> ${target}${note}`,
      );
    }
    const missingTargets = existingOld
      .map((row) => OLD_TO_NEW[row.slug])
      .filter((target) => !flat.some((row) => row.slug === target));
    if (missingTargets.length > 0) {
      console.warn("\nWARNING: these mapping targets are not in the new tree:", [
        ...new Set(missingTargets),
      ]);
    }
    console.log("\nDry run — no changes made.");
    return;
  }

  // 1. Create every new category (two passes, same as create-catalog-categories.ts).
  for (const row of flat) {
    await prisma.category.upsert({
      where: { slug: row.slug },
      create: {
        slug: row.slug,
        name: row.name,
        filterKeys: row.filterKeys,
        position: row.position,
      },
      update: {
        name: row.name,
        filterKeys: row.filterKeys,
        position: row.position,
      },
    });
  }
  for (const row of flat) {
    const parentId = row.parentSlug
      ? (
          await prisma.category.findUniqueOrThrow({
            where: { slug: row.parentSlug },
            select: { id: true },
          })
        ).id
      : null;
    await prisma.category.update({
      where: { slug: row.slug },
      data: { parentId },
    });
  }
  console.log(`Created/updated ${flat.length} categories.`);

  // 2. Reassign products off old categories. A handful of old slugs are
  // also real new-tree slugs (ssd, gaming, wireless-charger) — those
  // categories simply persist unchanged, nothing to move or delete.
  const keptSlugs = new Set(
    Object.entries(OLD_TO_NEW)
      .filter(([oldSlug, newSlug]) => oldSlug === newSlug)
      .map(([oldSlug]) => oldSlug),
  );
  if (keptSlugs.size > 0) {
    console.log(`Unchanged (old slug = new slug): ${[...keptSlugs].join(", ")}`);
  }

  let reassigned = 0;
  for (const [oldSlug, newSlug] of Object.entries(OLD_TO_NEW)) {
    if (keptSlugs.has(oldSlug)) {
      continue;
    }
    const oldCategory = await prisma.category.findUnique({
      where: { slug: oldSlug },
      select: { id: true },
    });
    if (!oldCategory) {
      continue; // Not present in this DB — nothing to migrate.
    }
    const newCategory = await prisma.category.findUnique({
      where: { slug: newSlug },
      select: { id: true },
    });
    if (!newCategory) {
      console.error(
        `Mapping target "${newSlug}" for old category "${oldSlug}" does not exist — skipping, old category will not be deleted.`,
      );
      continue;
    }
    const result = await prisma.product.updateMany({
      where: { categoryId: oldCategory.id },
      data: { categoryId: newCategory.id },
    });
    if (result.count > 0) {
      console.log(
        `  Moved ${result.count} product(s): ${oldSlug} -> ${newSlug}`,
      );
    }
    reassigned += result.count;
  }
  console.log(`Reassigned ${reassigned} product(s) total.`);

  // 3. Delete old categories (children before parents is not required —
  // Category.parent uses onDelete: SetNull — but old-tree slugs are deleted
  // in the same pass regardless of order).
  let deleted = 0;
  for (const oldSlug of Object.keys(OLD_TO_NEW)) {
    if (keptSlugs.has(oldSlug)) {
      continue;
    }
    const existing = await prisma.category.findUnique({
      where: { slug: oldSlug },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!existing) {
      continue;
    }
    if (existing._count.products > 0) {
      console.error(
        `Refusing to delete "${oldSlug}" — still has ${existing._count.products} product(s) (mapping target missing above?).`,
      );
      continue;
    }
    await prisma.category.delete({ where: { id: existing.id } });
    deleted += 1;
  }
  console.log(`Deleted ${deleted} old categor${deleted === 1 ? "y" : "ies"}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

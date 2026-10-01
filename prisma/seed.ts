/**
 * Database seed (P10-T05).
 *
 *   npm run db:seed
 *
 * Loads the demo catalogue and the reference data the app needs to function,
 * reading from the same mock modules the UI renders today (`lib/data/mocks`,
 * `lib/cart`, `lib/admin`). Seeding from one source means the database and the
 * mock-backed pages agree, which is what makes the P10-T06 repository swap
 * verifiable.
 *
 * Idempotent: every write is an upsert keyed on a natural unique column, so
 * re-running updates rather than duplicating.
 *
 * Scope: catalogue (categories, brands, warranties, products, images,
 * attributes, spec chips and groups, stock, reviews, questions) and reference
 * data (permissions, roles, refund reasons, shipping, PC Builder rules, site
 * settings). One demo customer and one demo staff account are seeded for local
 * auth testing — never use those credentials outside development.
 *
 * Deliberately no staff logins, orders, or payments yet.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnvFiles } from "dotenv";
import {
  MOCK_STAFF_ROLES,
  FEATURE_PERMISSION_GROUPS,
} from "@/lib/admin/feature-permissions-mock";
import {
  MOCK_ADMIN_COUPONS,
  MOCK_ADMIN_PROMOTIONS,
} from "@/lib/admin/marketing-mock";
import { MOCK_FLASH_DEALS } from "@/lib/admin/promotions-offers-mock";
import {
  MOCK_BLOG_CATEGORIES,
  MOCK_BLOG_POSTS,
  MOCK_EMAIL_TEMPLATES_NEXA,
  MOCK_NOTIFICATION_TYPES_NEXA,
  MOCK_SUBSCRIBERS,
} from "@/lib/admin/engagement-mock";
import { parseFlashDateTime } from "@/lib/marketing/flash-sale-dates";
import { MOCK_PC_BUILDER_RULES } from "@/lib/admin/pc-builder-admin-mock";
import {
  MOCK_CATEGORY_REFUND_DAYS,
  MOCK_REFUND_REASONS,
  MOCK_REFUND_SETTINGS,
} from "@/lib/admin/refunds-admin-mock";
import { DEFAULT_BUSINESS_SETTINGS } from "@/lib/admin/settings-mock";
import {
  MOCK_SHIPPING_AREAS,
  MOCK_SHIPPING_METHODS,
  MOCK_SHIPPING_ZONES,
} from "@/lib/cart/shipping";
import {
  mockBrands,
  mockCategories,
  mockProducts,
} from "@/lib/data/mocks/catalog";
import { mockReviewRepository } from "@/lib/data/mocks/review-repository";
import type { BuilderSlot, ProductDetail } from "@/lib/data/types/catalog";
import type { StockStatus } from "@/lib/data/types/common";
import { hashPassword } from "@/lib/auth/password";
import { PrismaClient } from "../lib/generated/prisma/client";

/** Local-only demo customer. Documented in docs/DATABASE.md — never production. */
const DEMO_CUSTOMER = {
  email: "customer@techno-house.demo",
  fullName: "Demo Customer",
  phone: null as string | null,
  password: "Demo-Customer-Only-11!",
} as const;

/** Local-only demo staff. Same docs — never production. */
const DEMO_STAFF = {
  email: "ops@techno-house.demo",
  fullName: "Ayesha Rahman",
  password: "Demo-Staff-Only-11!",
  roleKey: "role-admin",
} as const;

type StockStatusValue = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

const STOCK_STATUS: Record<StockStatus, StockStatusValue> = {
  in_stock: "IN_STOCK",
  low_stock: "LOW_STOCK",
  out_of_stock: "OUT_OF_STOCK",
};

/** Demo stock levels, chosen to match the status the storefront shows. */
const STOCK_QUANTITY: Record<StockStatusValue, number> = {
  IN_STOCK: 25,
  LOW_STOCK: 4,
  OUT_OF_STOCK: 0,
};

/** Mock slot ids map 1:1 onto the BuilderSlot enum; spelled out so a new slot
 *  fails typecheck instead of silently seeding null. */
const BUILDER_SLOT = {
  cpu: "CPU",
  cpu_cooler: "CPU_COOLER",
  motherboard: "MOTHERBOARD",
  ram: "RAM",
  gpu: "GPU",
  ssd: "SSD",
  hdd: "HDD",
  psu: "PSU",
  case: "CASE",
  case_fans: "CASE_FANS",
  monitor: "MONITOR",
  keyboard: "KEYBOARD",
  mouse: "MOUSE",
  ups: "UPS",
  speaker: "SPEAKER",
  headphone: "HEADPHONE",
  network_adapter: "NETWORK_ADAPTER",
  antivirus: "ANTIVIRUS",
} as const satisfies Record<BuilderSlot, string>;

const PC_RULE_TYPE = {
  socket: "SOCKET",
  ram_type: "RAM_TYPE",
  psu_wattage: "PSU_WATTAGE",
  form_factor: "FORM_FACTOR",
  storage_interface: "STORAGE_INTERFACE",
} as const;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleCase(value: string): string {
  const spaced = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function warrantyCode(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function warrantyMonths(label: string): number | null {
  const years = /(\d+)\s*year/i.exec(label);
  if (years?.[1]) {
    return Number(years[1]) * 12;
  }
  const months = /(\d+)\s*month/i.exec(label);
  if (months?.[1]) {
    return Number(months[1]);
  }
  return null;
}

/**
 * Display label for an attribute definition, preferring the wording the
 * product already uses over a mechanical de-camelCasing of the key.
 */
function attributeLabel(product: ProductDetail, attributeKey: string): string {
  const key = normalize(attributeKey);

  const chip = product.specs.find((spec) => normalize(spec.label) === key);
  if (chip) {
    return chip.label;
  }

  for (const group of product.specGroups) {
    const row = group.rows.find((item) => normalize(item.key) === key);
    if (row) {
      return row.key;
    }
  }

  return titleCase(attributeKey);
}

async function main(): Promise<void> {
  loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed: this loads demo catalogue data and must never run against production.",
    );
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — see docs/DATABASE.md.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    // --- Store settings -----------------------------------------------------
    const business = DEFAULT_BUSINESS_SETTINGS;
    await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        storeName: business.storeName,
        legalName: business.legalName,
        supportEmail: business.supportEmail,
        phone: business.phone,
        address: business.address,
        city: business.city,
        timezone: business.timezone,
        taxId: business.taxId,
      },
      // Keep staff business edits across re-seeds.
      update: {},
    });

    // --- Permissions and roles ---------------------------------------------
    for (const group of FEATURE_PERMISSION_GROUPS) {
      for (const permission of group.permissions) {
        await prisma.permission.upsert({
          where: { key: permission.id },
          create: {
            key: permission.id,
            groupKey: group.id,
            label: permission.label,
          },
          update: { groupKey: group.id, label: permission.label },
        });
      }
    }

    for (const role of MOCK_STAFF_ROLES) {
      // Admin holds every permission, so it must not be deletable from the UI.
      const isSystem = role.id === "role-admin";
      const record = await prisma.role.upsert({
        where: { key: role.id },
        create: { key: role.id, name: role.name, isSystem },
        update: { name: role.name, isSystem },
      });

      const permissions = await prisma.permission.findMany({
        where: { key: { in: [...role.permissionIds] } },
        select: { id: true },
      });

      const grantCount = await prisma.rolePermission.count({
        where: { roleId: record.id },
      });

      if (isSystem) {
        // Grant newly added catalogue keys; do not undo local revocations.
        const existing = await prisma.rolePermission.findMany({
          where: { roleId: record.id },
          select: { permissionId: true },
        });
        const have = new Set(existing.map((row) => row.permissionId));
        const missing = permissions.filter(
          (permission) => !have.has(permission.id),
        );
        if (missing.length > 0) {
          await prisma.rolePermission.createMany({
            data: missing.map((permission) => ({
              roleId: record.id,
              permissionId: permission.id,
            })),
            skipDuplicates: true,
          });
        }
      } else if (grantCount === 0 && permissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: record.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    // --- Refund reasons -----------------------------------------------------
    for (const reason of MOCK_REFUND_REASONS) {
      await prisma.refundReason.upsert({
        where: { id: reason.id },
        create: {
          id: reason.id,
          type: reason.type === "customer" ? "CUSTOMER" : "STAFF",
          reason: reason.reason,
          isActive: reason.status,
        },
        update: { reason: reason.reason, isActive: reason.status },
      });
    }

    await prisma.refundSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        refundType: MOCK_REFUND_SETTINGS.refundType,
        globalRefundDays: MOCK_REFUND_SETTINGS.globalRefundDays,
        disputeEnabled: MOCK_REFUND_SETTINGS.disputeEnabled,
        disputeDays: MOCK_REFUND_SETTINGS.disputeDays,
        categoryDaysJson: JSON.stringify(MOCK_CATEGORY_REFUND_DAYS),
      },
      update: {},
    });

    // --- Shipping -----------------------------------------------------------
    for (const zone of MOCK_SHIPPING_ZONES) {
      await prisma.shippingZone.upsert({
        where: { code: zone.id },
        create: { code: zone.id, name: zone.name },
        // Keep staff name and enable flag across re-seeds.
        update: {},
      });
    }

    for (const area of MOCK_SHIPPING_AREAS) {
      const zone = await prisma.shippingZone.findUniqueOrThrow({
        where: { code: area.zoneId },
      });
      await prisma.shippingArea.upsert({
        where: { zoneId_name: { zoneId: zone.id, name: area.name } },
        create: { zoneId: zone.id, name: area.name },
        update: {},
      });
    }

    for (const [index, method] of MOCK_SHIPPING_METHODS.entries()) {
      const record = await prisma.shippingMethod.upsert({
        where: { code: method.id },
        create: {
          code: method.id,
          name: method.name,
          description: method.description,
          baseRateAmount: method.baseRate,
          isPickup: method.id === "store_pickup",
          position: index,
        },
        // Keep staff name, rate, pickup, and enable flag across re-seeds.
        update: {},
      });

      // An empty zone list means the method applies everywhere.
      const zoneCodes =
        method.zoneIds.length > 0
          ? [...method.zoneIds]
          : MOCK_SHIPPING_ZONES.map((zone) => zone.id);
      const zones = await prisma.shippingZone.findMany({
        where: { code: { in: zoneCodes } },
        select: { id: true },
      });

      const existingLinks = await prisma.shippingMethodZone.count({
        where: { methodId: record.id },
      });
      if (existingLinks === 0) {
        await prisma.shippingMethodZone.createMany({
          data: zones.map((zone) => ({
            methodId: record.id,
            zoneId: zone.id,
            rateAmount: method.baseRate,
          })),
          skipDuplicates: true,
        });
      }
    }

    // --- PC Builder compatibility rules -------------------------------------
    for (const rule of MOCK_PC_BUILDER_RULES) {
      await prisma.pCCompatibilityRule.upsert({
        where: { key: rule.key },
        create: {
          key: rule.key,
          label: rule.label,
          type: PC_RULE_TYPE[rule.type],
          description: rule.description,
          isEnabled: rule.enabled,
        },
        // Keep staff enable/disable choices across re-seeds.
        update: {
          label: rule.label,
          type: PC_RULE_TYPE[rule.type],
          description: rule.description,
        },
      });
    }

    // --- Promotion campaigns (P15-T01) --------------------------------------
    const PROMOTION_STATUS = {
      draft: "DRAFT",
      scheduled: "SCHEDULED",
      active: "ACTIVE",
      paused: "PAUSED",
      ended: "ENDED",
    } as const;
    const PROMOTION_CHANNEL = {
      homepage: "HOMEPAGE",
      category: "CATEGORY",
      sitewide: "SITEWIDE",
    } as const;
    for (const promo of MOCK_ADMIN_PROMOTIONS) {
      const startsAt = new Date(`${promo.startsAt}T00:00:00.000Z`);
      const endsAt = new Date(`${promo.endsAt}T00:00:00.000Z`);
      await prisma.promotion.upsert({
        where: { slug: promo.slug },
        create: {
          slug: promo.slug,
          name: promo.name,
          kind: "PROMOTION",
          channel: PROMOTION_CHANNEL[promo.channel],
          status: PROMOTION_STATUS[promo.status],
          summary: promo.summary,
          priority: promo.priority,
          startsAt: Number.isNaN(startsAt.getTime()) ? null : startsAt,
          endsAt: Number.isNaN(endsAt.getTime()) ? null : endsAt,
        },
        // Keep staff status and schedule across re-seeds.
        update: {
          name: promo.name,
          channel: PROMOTION_CHANNEL[promo.channel],
          summary: promo.summary,
          priority: promo.priority,
        },
      });
    }

    for (const deal of MOCK_FLASH_DEALS) {
      const startsAt = parseFlashDateTime(deal.startsAt);
      const endsAt = parseFlashDateTime(deal.endsAt);
      if (!startsAt || !endsAt) {
        continue;
      }
      await prisma.flashSale.upsert({
        where: { slug: deal.id },
        create: {
          slug: deal.id,
          title: deal.title,
          status: deal.statusOn ? "ACTIVE" : "PAUSED",
          isFeatured: deal.featured,
          startsAt,
          endsAt,
        },
        // Keep staff status, featured flag, and schedule across re-seeds.
        update: {
          title: deal.title,
        },
      });
    }

    for (const coupon of MOCK_ADMIN_COUPONS) {
      const startsAt = new Date(`${coupon.startsAt}T00:00:00.000Z`);
      const endsAt = new Date(`${coupon.endsAt}T00:00:00.000Z`);
      await prisma.coupon.upsert({
        where: { code: coupon.code },
        create: {
          code: coupon.code,
          kind: coupon.kind === "percent" ? "PERCENT" : "FIXED",
          value: coupon.value,
          label: coupon.label,
          minSpendAmount: coupon.minSpend?.amount ?? null,
          usageLimit: coupon.usageLimit,
          usageCount: 0,
          isActive: coupon.status !== "disabled",
          startsAt: Number.isNaN(startsAt.getTime()) ? null : startsAt,
          endsAt: Number.isNaN(endsAt.getTime()) ? null : endsAt,
        },
        // Keep staff status, dates, and usage across re-seeds.
        update: {
          kind: coupon.kind === "percent" ? "PERCENT" : "FIXED",
          value: coupon.value,
          label: coupon.label,
          minSpendAmount: coupon.minSpend?.amount ?? null,
          usageLimit: coupon.usageLimit,
        },
      });
    }

    const BLOG_STATUS = {
      draft: "DRAFT",
      scheduled: "SCHEDULED",
      published: "PUBLISHED",
    } as const;
    for (const category of MOCK_BLOG_CATEGORIES) {
      await prisma.blogCategory.upsert({
        where: { slug: category.slug },
        create: {
          slug: category.slug,
          name: category.name,
          isActive: category.status,
        },
        // Keep staff active flag across re-seeds.
        update: {
          name: category.name,
        },
      });
    }
    for (const post of MOCK_BLOG_POSTS) {
      const categorySlug = MOCK_BLOG_CATEGORIES.find(
        (category) => category.name === post.category,
      )?.slug;
      const category = categorySlug
        ? await prisma.blogCategory.findUnique({
            where: { slug: categorySlug },
            select: { id: true },
          })
        : null;
      const publishedAt = post.publishedAt
        ? new Date(`${post.publishedAt}T00:00:00.000Z`)
        : null;
      await prisma.blogPost.upsert({
        where: { slug: post.slug },
        create: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt || null,
          body: post.body,
          categoryId: category?.id ?? null,
          status: BLOG_STATUS[post.status],
          publishedAt:
            publishedAt && !Number.isNaN(publishedAt.getTime())
              ? publishedAt
              : null,
        },
        // Keep staff status and publishedAt across re-seeds.
        update: {
          title: post.title,
          excerpt: post.excerpt || null,
          body: post.body,
          categoryId: category?.id ?? null,
        },
      });
    }

    for (const [index, type] of MOCK_NOTIFICATION_TYPES_NEXA.entries()) {
      await prisma.notificationTypeSetting.upsert({
        where: { name: type.name },
        create: {
          name: type.name,
          defaultText: type.defaultText,
          audience: type.audience === "admin" ? "ADMIN" : "CUSTOMER",
          enabled: type.enabled,
          isLocked: type.locked,
          position: index,
        },
        // Keep staff edits (text/enabled) across re-seeds.
        update: {},
      });
    }

    function slugKey(name: string): string {
      return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    const AUDIENCE_TO_DB = {
      all: "ALL",
      admin: "ADMIN",
      customer: "CUSTOMER",
      common: "COMMON",
    } as const;

    for (const [index, template] of MOCK_EMAIL_TEMPLATES_NEXA.entries()) {
      await prisma.emailTemplate.upsert({
        where: { key: slugKey(template.emailType) },
        create: {
          key: slugKey(template.emailType),
          emailType: template.emailType,
          subject: template.subject,
          body: `Hi [[customer_name]],\n\n${template.subject}.\n\nThanks,\n[[store_name]]`,
          audience: AUDIENCE_TO_DB[template.audience],
          enabled: template.enabled,
          isLocked: true,
          position: index,
        },
        // Keep staff edits (subject/body/enabled) across re-seeds.
        update: {},
      });
    }

    for (const subscriber of MOCK_SUBSCRIBERS) {
      const email = subscriber.title.trim().toLowerCase();
      if (!email.includes("@")) {
        continue;
      }
      const subscribedAt = new Date(`${subscriber.updatedAt}T00:00:00.000Z`);
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        create: {
          email,
          source: "seed",
          status: "SUBSCRIBED",
          subscribedAt: Number.isNaN(subscribedAt.getTime())
            ? undefined
            : subscribedAt,
        },
        // Keep staff status across re-seeds.
        update: {
          source: "seed",
        },
      });
    }

    // --- Brands -------------------------------------------------------------
    for (const [index, brand] of mockBrands.entries()) {
      await prisma.brand.upsert({
        where: { slug: brand.slug },
        create: {
          slug: brand.slug,
          name: brand.name,
          logoSrc: brand.logoSrc,
          position: index,
        },
        update: {
          name: brand.name,
          logoSrc: brand.logoSrc,
          position: index,
        },
      });
    }

    // --- Categories (two passes so parents exist before they are linked) ----
    for (const [index, category] of mockCategories.entries()) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        create: {
          slug: category.slug,
          name: category.name,
          filterKeys: [...category.filterKeys],
          position: index,
        },
        update: {
          name: category.name,
          filterKeys: [...category.filterKeys],
          position: index,
        },
      });
    }

    for (const category of mockCategories) {
      const parentId = category.parentSlug
        ? (
            await prisma.category.findUniqueOrThrow({
              where: { slug: category.parentSlug },
              select: { id: true },
            })
          ).id
        : null;
      await prisma.category.update({
        where: { slug: category.slug },
        data: { parentId },
      });
    }

    // --- Warranties (derived from the labels products already carry) --------
    const warrantyLabels = [
      ...new Set(mockProducts.map((product) => product.warrantyLabel)),
    ];
    for (const label of warrantyLabels) {
      await prisma.productWarranty.upsert({
        where: { code: warrantyCode(label) },
        create: {
          code: warrantyCode(label),
          label,
          months: warrantyMonths(label),
        },
        update: { label, months: warrantyMonths(label) },
      });
    }

    // --- Attribute definitions ---------------------------------------------
    const filterableKeys = new Set(
      mockCategories.flatMap((category) => category.filterKeys),
    );
    const attributeKeys = [
      ...new Set(
        mockProducts.flatMap((product) => Object.keys(product.attributes)),
      ),
    ];

    for (const [index, key] of attributeKeys.entries()) {
      const owner = mockProducts.find((product) => key in product.attributes);
      const label = owner ? attributeLabel(owner, key) : titleCase(key);
      const allowedValues = [
        ...new Set(
          mockProducts
            .map((product) => product.attributes[key])
            .filter((value): value is string => Boolean(value)),
        ),
      ];

      await prisma.productAttribute.upsert({
        where: { key },
        create: {
          key,
          label,
          isFilterable: filterableKeys.has(key),
          position: index,
          allowedValues,
        },
        update: {
          label,
          isFilterable: filterableKeys.has(key),
          position: index,
        },
      });
    }

    // --- Products -----------------------------------------------------------
    for (const [index, product] of mockProducts.entries()) {
      const [brand, category] = await Promise.all([
        prisma.brand.findUniqueOrThrow({
          where: { slug: product.brandSlug },
          select: { id: true },
        }),
        prisma.category.findUniqueOrThrow({
          where: { slug: product.categorySlug },
          select: { id: true },
        }),
      ]);
      const warranty = await prisma.productWarranty.findUnique({
        where: { code: warrantyCode(product.warrantyLabel) },
        select: { id: true },
      });

      const stockStatus = STOCK_STATUS[product.stockStatus];
      const shared = {
        name: product.name,
        brandId: brand.id,
        categoryId: category.id,
        warrantyId: warranty?.id ?? null,
        overview: [...product.overview],
        priceAmount: product.price.amount,
        compareAtAmount: product.compareAtPrice?.amount ?? null,
        stockStatus,
        isNew: product.isNew,
        isSale: product.isSale,
        position: index,
        builderSlot: product.builderSlot
          ? BUILDER_SLOT[product.builderSlot]
          : null,
        builderSocket: product.builderAttrs?.socket ?? null,
        builderRamType: product.builderAttrs?.ramType ?? null,
        builderFormFactor: product.builderAttrs?.formFactor ?? null,
        builderTdpWatts: product.builderAttrs?.tdpWatts ?? null,
      };

      const record = await prisma.product.upsert({
        where: { slug: product.slug },
        create: {
          // Demo products keep their catalogue id instead of taking a cuid, so
          // the id is stable across re-seeds and identical to what the mock
          // repositories return. Products created through the admin later get
          // generated ids as normal.
          id: product.id,
          slug: product.slug,
          sku: product.sku,
          publishedAt: new Date(),
          ...shared,
        },
        update: { sku: product.sku, ...shared },
      });

      // Images have no natural key, so replace the set.
      await prisma.productImage.deleteMany({ where: { productId: record.id } });
      await prisma.productImage.createMany({
        data: product.images.map((image, index) => ({
          productId: record.id,
          src: image.src,
          alt: image.alt,
          position: index,
          isPrimary: index === 0,
        })),
      });

      for (const [index, entry] of Object.entries(
        product.attributes,
      ).entries()) {
        const [key, value] = entry;
        const attribute = await prisma.productAttribute.findUniqueOrThrow({
          where: { key },
          select: { id: true },
        });
        await prisma.productAttributeValue.upsert({
          where: {
            productId_attributeId: {
              productId: record.id,
              attributeId: attribute.id,
            },
          },
          create: {
            productId: record.id,
            attributeId: attribute.id,
            value,
            position: index,
          },
          update: { value, position: index },
        });
      }

      // Chips and spec groups are ordered presentation data with no natural
      // key, so they are replaced wholesale like images.
      await prisma.productSpecChip.deleteMany({
        where: { productId: record.id },
      });
      await prisma.productSpecChip.createMany({
        data: product.specs.map((chip, index) => ({
          productId: record.id,
          label: chip.label,
          value: chip.value,
          position: index,
        })),
      });

      // Cascade clears the rows belonging to each group.
      await prisma.productSpecGroup.deleteMany({
        where: { productId: record.id },
      });
      for (const [index, group] of product.specGroups.entries()) {
        await prisma.productSpecGroup.create({
          data: {
            productId: record.id,
            title: group.title,
            position: index,
            rows: {
              create: group.rows.map((row, rowIndex) => ({
                label: row.key,
                value: row.value,
                position: rowIndex,
              })),
            },
          },
        });
      }

      const quantity = STOCK_QUANTITY[stockStatus];
      await prisma.productStock.upsert({
        where: { productId: record.id },
        create: { productId: record.id, quantity },
        update: { quantity },
      });
    }

    // --- Related products (second pass: every product now exists) -----------
    for (const product of mockProducts) {
      if (product.relatedSlugs.length === 0) {
        continue;
      }
      const related = await prisma.product.findMany({
        where: { slug: { in: [...product.relatedSlugs] } },
        select: { id: true },
      });
      await prisma.product.update({
        where: { slug: product.slug },
        data: { relatedTo: { set: related.map((item) => ({ id: item.id })) } },
      });
    }

    // --- Reviews and questions ---------------------------------------------
    for (const product of mockProducts) {
      const record = await prisma.product.findUniqueOrThrow({
        where: { slug: product.slug },
        select: { id: true },
      });

      const reviews = await mockReviewRepository.listReviewsByProductSlug(
        product.slug,
      );
      for (const review of reviews) {
        await prisma.productReview.upsert({
          where: { id: review.id },
          create: {
            id: review.id,
            productId: record.id,
            authorName: review.authorName,
            rating: review.rating,
            title: review.title,
            body: review.body,
            status: "PUBLISHED",
            createdAt: new Date(review.createdAt),
          },
          update: {
            rating: review.rating,
            title: review.title,
            body: review.body,
            status: "PUBLISHED",
          },
        });
      }

      const questions = await mockReviewRepository.listQuestionsByProductSlug(
        product.slug,
      );
      for (const question of questions) {
        const answered = Boolean(question.answer);
        await prisma.productQuestion.upsert({
          where: { id: question.id },
          create: {
            id: question.id,
            productId: record.id,
            askerName: question.askerName,
            question: question.question,
            answer: question.answer,
            answeredBy: question.answeredBy,
            answeredAt: answered ? new Date(question.createdAt) : null,
            status: answered ? "ANSWERED" : "PENDING",
            createdAt: new Date(question.createdAt),
          },
          update: {
            answer: question.answer,
            answeredBy: question.answeredBy,
            status: answered ? "ANSWERED" : "PENDING",
          },
        });
      }
    }

    // --- Demo customer (local auth only) ------------------------------------
    const demoPasswordHash = await hashPassword(DEMO_CUSTOMER.password);
    const demoUser = await prisma.user.upsert({
      where: { email: DEMO_CUSTOMER.email },
      create: {
        email: DEMO_CUSTOMER.email,
        fullName: DEMO_CUSTOMER.fullName,
        phone: DEMO_CUSTOMER.phone,
        passwordHash: demoPasswordHash,
        status: "ACTIVE",
      },
      update: {
        fullName: DEMO_CUSTOMER.fullName,
        passwordHash: demoPasswordHash,
        status: "ACTIVE",
      },
    });
    await prisma.notification.upsert({
      where: { id: "ntf-welcome-demo" },
      create: {
        id: "ntf-welcome-demo",
        userId: demoUser.id,
        channel: "IN_APP",
        type: "account",
        title: "Your account is ready",
        body: "Alerts here are saved to your account. Email and SMS wait for a later phase.",
        href: "/account/profile",
        sentAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      // Keep readAt across re-seeds.
      update: {
        title: "Your account is ready",
        body: "Alerts here are saved to your account. Email and SMS wait for a later phase.",
        href: "/account/profile",
      },
    });

    // --- Demo staff (local auth only) ---------------------------------------
    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { key: DEMO_STAFF.roleKey },
      select: { id: true },
    });
    const demoStaffHash = await hashPassword(DEMO_STAFF.password);
    await prisma.staff.upsert({
      where: { email: DEMO_STAFF.email },
      create: {
        email: DEMO_STAFF.email,
        fullName: DEMO_STAFF.fullName,
        passwordHash: demoStaffHash,
        status: "ACTIVE",
        roleId: adminRole.id,
      },
      update: {
        fullName: DEMO_STAFF.fullName,
        passwordHash: demoStaffHash,
        status: "ACTIVE",
        roleId: adminRole.id,
      },
    });

    const globalSeo = await prisma.sEOConfiguration.findFirst({
      where: { path: null },
      select: { id: true },
    });
    if (!globalSeo) {
      await prisma.sEOConfiguration.create({
        data: {
          path: null,
          title: null,
          description: null,
          keywords: [],
        },
      });
    }

    for (const provider of [
      "GA4",
      "GTM",
      "META_PIXEL",
      "MERCHANT_CENTER",
    ] as const) {
      await prisma.analyticsConfiguration.upsert({
        where: { provider },
        create: {
          provider,
          isEnabled: false,
          publicId: null,
        },
        // Keep staff enable flag and public id across re-seeds.
        update: {},
      });
    }

    await prisma.otpSmsConfiguration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        provider: "local-mock",
        senderId: null,
        otpLength: 6,
        expiryMinutes: 5,
        otpLogin: false,
        otpRegistration: false,
      },
      // Keep staff provider, sender, length, expiry, and flags across re-seeds.
      update: {},
    });

    await prisma.smtpConfiguration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        mailerType: "smtp",
        host: null,
        port: 587,
        username: null,
        encryption: "tls",
        fromAddress: null,
        fromName: null,
      },
      // Keep staff SMTP settings across re-seeds.
      update: {},
    });

    for (const provider of [
      "GOOGLE",
      "FACEBOOK",
      "TWITTER",
      "APPLE",
    ] as const) {
      await prisma.socialLoginConfiguration.upsert({
        where: { provider },
        create: {
          provider,
          isEnabled: false,
          publicClientId: null,
        },
        // Keep staff enable flag and public client id across re-seeds.
        update: {},
      });
    }

    await prisma.recaptchaConfiguration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        isEnabled: false,
        siteKey: null,
        scoreThreshold: 0.5,
        pageAdminLogin: false,
        pageCustomerLogin: false,
        pageCustomerRegistration: false,
        pageForgotPassword: false,
        pageContactUs: false,
      },
      update: {},
    });

    await prisma.firebaseConfiguration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        isEnabled: false,
      },
      update: {},
    });

    await prisma.googleMapConfiguration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        isEnabled: false,
      },
      update: {},
    });

    for (const provider of ["WHATSAPP", "MESSENGER"] as const) {
      await prisma.chatWidgetConfiguration.upsert({
        where: { provider },
        create: {
          provider,
          isEnabled: false,
          publicHandle: null,
        },
        update: {},
      });
    }

    await prisma.commentSystemConfiguration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        isEnabled: false,
        provider: "facebook",
        publicAppId: null,
      },
      update: {},
    });

    const counts = {
      categories: await prisma.category.count(),
      brands: await prisma.brand.count(),
      products: await prisma.product.count(),
      images: await prisma.productImage.count(),
      attributes: await prisma.productAttribute.count(),
      attributeValues: await prisma.productAttributeValue.count(),
      specChips: await prisma.productSpecChip.count(),
      specGroups: await prisma.productSpecGroup.count(),
      specRows: await prisma.productSpecRow.count(),
      warranties: await prisma.productWarranty.count(),
      reviews: await prisma.productReview.count(),
      questions: await prisma.productQuestion.count(),
      permissions: await prisma.permission.count(),
      roles: await prisma.role.count(),
      refundReasons: await prisma.refundReason.count(),
      shippingZones: await prisma.shippingZone.count(),
      shippingAreas: await prisma.shippingArea.count(),
      shippingMethods: await prisma.shippingMethod.count(),
      pcRules: await prisma.pCCompatibilityRule.count(),
      promotions: await prisma.promotion.count(),
      flashSales: await prisma.flashSale.count(),
      coupons: await prisma.coupon.count(),
      blogCategories: await prisma.blogCategory.count(),
      blogPosts: await prisma.blogPost.count(),
      subscribers: await prisma.newsletterSubscriber.count(),
      notifications: await prisma.notification.count(),
      customers: await prisma.user.count(),
      analytics: await prisma.analyticsConfiguration.count(),
      seo: await prisma.sEOConfiguration.count(),
      otpSms: await prisma.otpSmsConfiguration.count(),
      smtp: await prisma.smtpConfiguration.count(),
      socialLogins: await prisma.socialLoginConfiguration.count(),
      recaptcha: await prisma.recaptchaConfiguration.count(),
      firebase: await prisma.firebaseConfiguration.count(),
      googleMap: await prisma.googleMapConfiguration.count(),
      chatWidgets: await prisma.chatWidgetConfiguration.count(),
      commentSystem: await prisma.commentSystemConfiguration.count(),
      siteSettings: await prisma.siteSettings.count(),
      staff: await prisma.staff.count(),
      notificationTypes: await prisma.notificationTypeSetting.count(),
      emailTemplates: await prisma.emailTemplate.count(),
    };

    console.log("seed complete");
    for (const [name, value] of Object.entries(counts)) {
      console.log(`  ${name.padEnd(16)} ${value}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "seed failed —",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});

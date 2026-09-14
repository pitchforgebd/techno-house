/**
 * Local A–Z smoke: seed inventory, auth, CRUD round-trips, storefront reads.
 *
 *   npx tsx scripts/test/smoke-e2e.ts
 *
 * Uses the same lib helpers as admin/storefront. Creates only disposable
 * `e2e-smoke-*` rows and deletes them. Safe for local techno_house_dev.
 */
import { config as loadEnvFiles } from "dotenv";
loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { verifyPassword } from "@/lib/auth/password";
import {
  deleteAdminBrand,
  saveAdminBrand,
} from "@/lib/catalog/admin-brands";
import {
  deleteAdminCategory,
  saveAdminCategory,
} from "@/lib/catalog/admin-categories";
import { getPrisma } from "@/lib/db/prisma";
import { setTodaysDealFlag } from "@/lib/marketing/deals";
import { saveCoupon } from "@/lib/marketing/coupons";
import {
  brandRepository,
  categoryRepository,
  productRepository,
} from "@/lib/data";
import {
  updateAdminProductFlags,
} from "@/lib/catalog/admin-products";
import {
  listAdminShippingMethods,
  listPublicShippingMethods,
  saveShippingMethod,
} from "@/lib/shipping/methods";
import { getStorefrontSeoMetadata } from "@/lib/seo/config";
import { listSitemapPaths } from "@/lib/seo/sitemap";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

async function main(): Promise<void> {
  if (process.env.DATA_SOURCE === "mock") {
    console.error("fail DATA_SOURCE=mock — e2e needs PostgreSQL");
    process.exit(1);
  }

  const prisma = getPrisma();
  const stamp = Date.now().toString(36);
  const brandSlug = `e2e-smoke-brand-${stamp}`;
  const categorySlug = `e2e-smoke-cat-${stamp}`;
  const couponCode = `E2E${stamp.toUpperCase().slice(-6)}`;

  try {
    // --- Seed / inventory ---
    const [
      productCount,
      brandCount,
      categoryCount,
      staff,
      customer,
      roleCount,
      permissionCount,
      shippingTotal,
      shippingActive,
      couponCount,
      blogCount,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.brand.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.staff.findUnique({
        where: { email: "ops@techno-house.demo" },
        select: { id: true, passwordHash: true, status: true, roleId: true },
      }),
      prisma.user.findUnique({
        where: { email: "customer@techno-house.demo" },
        select: { id: true, passwordHash: true },
      }),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.shippingMethod.count(),
      prisma.shippingMethod.count({ where: { isActive: true } }),
      prisma.coupon.count(),
      prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    ]);

    check("seed has active products", productCount >= 10, String(productCount));
    check("seed has active brands", brandCount >= 5, String(brandCount));
    check("seed has active categories", categoryCount >= 5, String(categoryCount));
    check("seed has roles", roleCount >= 1);
    check("seed has permissions", permissionCount >= 50, String(permissionCount));
    check(
      "seed has shipping methods",
      shippingTotal >= 1,
      shippingTotal === 0
        ? "0 rows — run npm run db:seed (P16 shipping upsert)"
        : String(shippingTotal),
    );
    check(
      "seed has active shipping methods",
      shippingActive >= 1,
      shippingActive === 0
        ? `0 active / ${shippingTotal} total — checkout would show no rates (activate below)`
        : String(shippingActive),
    );
    check("demo staff exists", Boolean(staff?.passwordHash));
    check("demo staff is ACTIVE", staff?.status === "ACTIVE");
    check("demo customer exists", Boolean(customer?.passwordHash));

    if (staff?.passwordHash) {
      check(
        "demo staff password verifies",
        await verifyPassword(staff.passwordHash, "Demo-Staff-Only-11!"),
      );
    }
    if (customer?.passwordHash) {
      check(
        "demo customer password verifies",
        await verifyPassword(customer.passwordHash, "Demo-Customer-Only-11!"),
      );
    }

    // --- Storefront repository vs DB ---
    const listing = await productRepository.list({ page: 1, pageSize: 12 });
    check(
      "productRepository.list returns items",
      listing.items.length > 0 && listing.total >= listing.items.length,
    );
    const first = listing.items[0];
    if (first) {
      const detail = await productRepository.getBySlug(first.slug);
      const dbRow = await prisma.product.findUnique({
        where: { slug: first.slug },
        select: { name: true, priceAmount: true, isActive: true },
      });
      check("getBySlug matches DB name", detail?.name === dbRow?.name);
      check(
        "getBySlug price matches DB",
        detail?.price.amount === dbRow?.priceAmount,
      );
      check("listed product is active in DB", dbRow?.isActive === true);

      const flagOff = await updateAdminProductFlags({
        id: first.id,
        featured: false,
      });
      check("product flag update", flagOff.ok);
      const afterOff = await prisma.product.findUnique({
        where: { id: first.id },
        select: { isNew: true },
      });
      check("product flag OFF persisted", afterOff?.isNew === false);
      const flagOn = await updateAdminProductFlags({
        id: first.id,
        featured: true,
      });
      check("product flag restore", flagOn.ok);
      const afterOn = await prisma.product.findUnique({
        where: { id: first.id },
        select: { isNew: true },
      });
      check("product flag ON persisted", afterOn?.isNew === true);
    }

    const brands = await brandRepository.list();
    check(
      "brandRepository.list count ≤ active brands",
      brands.length > 0 && brands.length <= brandCount,
    );
    const categories = await categoryRepository.list();
    check("categoryRepository.list nonempty", categories.length > 0);

    // --- Brand CRUD ---
    const brandCreate = await saveAdminBrand({
      fields: {
        name: `E2E Smoke Brand ${stamp}`,
        slug: brandSlug,
        position: "9990",
        description: "Disposable e2e brand",
        isActive: true,
      },
    });
    check("brand create", brandCreate.ok, !brandCreate.ok ? brandCreate.formError : undefined);
    const brandInDb = await prisma.brand.findUnique({ where: { slug: brandSlug } });
    check("brand create persisted", brandInDb?.name.includes("E2E Smoke Brand") === true);

    const brandUpdate = await saveAdminBrand({
      currentSlug: brandSlug,
      fields: {
        name: `E2E Smoke Brand Updated ${stamp}`,
        slug: brandSlug,
        position: "9991",
        description: "Updated",
        isActive: true,
      },
    });
    check("brand update", brandUpdate.ok);
    const brandAfter = await prisma.brand.findUnique({ where: { slug: brandSlug } });
    check(
      "brand update persisted",
      brandAfter?.name.includes("Updated") === true && brandAfter.position === 9991,
    );

    const brandDelete = await deleteAdminBrand({ slug: brandSlug });
    check("brand delete", brandDelete.ok);
    check(
      "brand delete persisted",
      (await prisma.brand.findUnique({ where: { slug: brandSlug } })) === null,
    );

    // --- Category CRUD ---
    const catCreate = await saveAdminCategory({
      fields: {
        name: `E2E Smoke Category ${stamp}`,
        slug: categorySlug,
        parentSlug: "",
        position: "9990",
        description: "Disposable e2e category",
        filterKeywords: "e2e,smoke",
        filterAttr: "",
        isActive: true,
      },
    });
    check("category create", catCreate.ok, !catCreate.ok ? catCreate.formError : undefined);
    check(
      "category create persisted",
      (await prisma.category.findUnique({ where: { slug: categorySlug } })) != null,
    );

    const catDelete = await deleteAdminCategory({ slug: categorySlug });
    check("category delete", catDelete.ok, !catDelete.ok ? catDelete.formError : undefined);
    check(
      "category delete persisted",
      (await prisma.category.findUnique({ where: { slug: categorySlug } })) === null,
    );

    // --- Coupon create (disable via status) ---
    const couponSave = await saveCoupon({
      code: couponCode,
      kind: "fixed",
      value: "100",
      label: `E2E smoke ${stamp}`,
      status: "active",
      perUserLimit: "", usageLimit: "",
      minSpend: "",
      startsAt: "",
      endsAt: "",
    });
    check("coupon create", couponSave.ok, !couponSave.ok ? couponSave.formError : undefined);
    const couponRow = await prisma.coupon.findFirst({
      where: { code: couponCode },
    });
    check("coupon create persisted", couponRow != null && couponRow.isActive === true);

    if (couponRow) {
      const couponOff = await saveCoupon({
        id: couponRow.id,
        code: couponCode,
        kind: "fixed",
        value: "100",
        label: `E2E smoke ${stamp}`,
        status: "disabled",
        perUserLimit: "", usageLimit: "",
        minSpend: "",
        startsAt: "",
        endsAt: "",
      });
      check("coupon disable", couponOff.ok);
      const couponAfter = await prisma.coupon.findUnique({ where: { id: couponRow.id } });
      check("coupon disable persisted", couponAfter?.isActive === false);
      await prisma.coupon.delete({ where: { id: couponRow.id } });
      check(
        "coupon cleanup deleted",
        (await prisma.coupon.findUnique({ where: { id: couponRow.id } })) === null,
      );
    }

    // --- Today's deal flag (= Product.isSale merchandising) ---
    const dealProduct = await prisma.product.findFirst({
      where: { isActive: true },
      select: { id: true, isSale: true },
    });
    if (dealProduct) {
      const on = await setTodaysDealFlag({
        productIds: [dealProduct.id],
        on: true,
      });
      check("todays-deal ON", on.ok);
      check(
        "todays-deal ON persisted",
        (
          await prisma.product.findUnique({
            where: { id: dealProduct.id },
            select: { isSale: true },
          })
        )?.isSale === true,
      );
      const off = await setTodaysDealFlag({
        productIds: [dealProduct.id],
        on: false,
      });
      check("todays-deal OFF", off.ok);
      check(
        "todays-deal OFF persisted",
        (
          await prisma.product.findUnique({
            where: { id: dealProduct.id },
            select: { isSale: true },
          })
        )?.isSale === false,
      );
      // restore prior flag
      if (dealProduct.isSale) {
        await setTodaysDealFlag({ productIds: [dealProduct.id], on: true });
      }
    } else {
      check("todays-deal product available", false);
    }

    // --- Shipping activate (admin path) + public list ---
    const adminMethods = await listAdminShippingMethods();
    check("admin shipping methods list", adminMethods.length >= 1);
    if (adminMethods.length > 0 && shippingActive === 0) {
      let activated = 0;
      for (const method of adminMethods) {
        const result = await saveShippingMethod({
          id: method.id,
          name: method.name,
          description: method.description,
          baseRate: String(method.baseRate),
          isPickup: method.isPickup,
          isActive: true,
        });
        if (result.ok) activated += 1;
      }
      check(
        "shipping activate via saveShippingMethod",
        activated === adminMethods.length,
        `${activated}/${adminMethods.length}`,
      );
    }
    const methods = await listPublicShippingMethods();
    check(
      "public shipping methods",
      methods.length >= 1,
      methods.length === 0 ? "empty after activate attempt" : String(methods.length),
    );

    // --- SEO / sitemap ---
    const seo = await getStorefrontSeoMetadata();
    check("storefront SEO title nonempty", seo.title.trim().length > 0);
    const paths = await listSitemapPaths();
    check(
      "sitemap includes shop + products",
      paths.includes("/shop") && paths.some((p) => p.startsWith("/product/")),
    );

    // Inventory snapshot for the report
    console.log("");
    console.log("snapshot", {
      products: productCount,
      brands: brandCount,
      categories: categoryCount,
      coupons: couponCount,
      publishedPosts: blogCount,
      shippingMethodsTotal: shippingTotal,
      shippingMethodsActiveBefore: shippingActive,
      shippingMethodsPublicAfter: methods.length,
      permissions: permissionCount,
    });
  } finally {
    // Best-effort cleanup if a mid-test failure left rows
    await prisma.brand.deleteMany({ where: { slug: { startsWith: "e2e-smoke-brand-" } } });
    await prisma.category.deleteMany({
      where: { slug: { startsWith: "e2e-smoke-cat-" } },
    });
    await prisma.coupon.deleteMany({ where: { code: { startsWith: "E2E" } } });
  }

  console.log("");
  console.log(
    failures === 0
      ? `ok ${checks} e2e smoke checks`
      : `failed ${failures}/${checks} e2e smoke checks`,
  );
  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

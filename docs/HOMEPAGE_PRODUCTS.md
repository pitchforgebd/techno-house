# Homepage products — staff guide

For shop staff. The homepage has two product sections, **Featured** and
**Best deals**. You choose exactly which products appear in each, and in what
order.

## Where

Admin → **Design Studio** → **Homepage products**
(`/admin/design-studio/home-products`). Needs the Design Studio manage
permission to change; view permission can open it.

## How to use it

1. Type at least two letters of a product name or SKU in **Add a product**.
   Several words work ("msi b650"). Only published products are offered.
2. Press **Add**. Use the up / down arrows to set the order, the bin to remove.
3. Press **Save section**. The homepage updates straight away.

Each section holds **at most 10** products. If you pick 7, the homepage shows
those 7 — it never fills the rest with other products.

## Things worth knowing

- **An empty section shows an automatic list** so the homepage is never blank:
  Featured shows the first 10 products of the catalogue; Best deals shows the
  10 deepest discounts among products with the *Today's deal* switch on. Choose
  products here to replace the automatic list.
- A chosen product that is later **unpublished** disappears from the homepage
  by itself (the screen marks it "Unpublished — hidden on the homepage"). An
  **out-of-stock** product is still shown, with its Out of stock badge.
- **Today's deal switch vs Best deals section.** The switch (in the product list
  and product form) decides what the **Deals page** shows, and you can switch on
  as many products as you like — the Deals page is paged. It does **not** decide
  which products the homepage shows. That is this screen.
- The product list column that used to be called **Featured** is now **New
  badge**. It always did exactly that: it puts a "New" badge on the product card.
  It never controlled the homepage Featured section.

## For developers

- Table `HomeSectionProduct` (`section` FEATURED | DEALS, `productId`,
  `position`, unique per section + product); migration
  `20261005120000_add_home_section_products`. **Run `npm run
  db:migrate:deploy` before the new build serves traffic.** The storefront read
  (`getHomeSectionSlugs`) never throws: if the table is missing it falls back to
  the automatic lists, so a deploy that forgot the migration shows the old
  behaviour instead of breaking the homepage — but saving on the admin screen
  will fail until the migration has run.
- Pure rules (max 10, de-duplication, ordering) are in
  `lib/marketing/home-section-input.ts`; database access in
  `lib/marketing/home-sections.ts`; storefront loader in
  `features/home/load-home-section.ts`.
- `npm run test:home-sections` (also part of `npm run test:regression`).

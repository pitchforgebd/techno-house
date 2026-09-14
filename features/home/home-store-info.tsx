import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { HomeSectionHeader } from "@/features/home/home-section-header";

const linkClass =
  "font-medium text-primary underline-offset-2 hover:underline";

type InfoBlock = {
  title: string;
  body: ReactNode;
};

const INTRO_BLOCKS: InfoBlock[] = [
  {
    title: "Laptops, components and electronics",
    body: (
      <>
        Browse the catalog by department:{" "}
        <Link href="/category/laptops" className={linkClass}>
          laptops
        </Link>{" "}
        for office and study,{" "}
        <Link href="/category/cpu" className={linkClass}>
          processors
        </Link>{" "}
        and{" "}
        <Link href="/category/graphics-cards" className={linkClass}>
          graphics cards
        </Link>{" "}
        for a new build, plus{" "}
        <Link href="/category/phones" className={linkClass}>
          phones
        </Link>
        ,{" "}
        <Link href="/category/gaming" className={linkClass}>
          gaming gear
        </Link>
        ,{" "}
        <Link href="/category/tvs" className={linkClass}>
          televisions
        </Link>
        , and{" "}
        <Link href="/category/printers" className={linkClass}>
          printers
        </Link>
        . Every listing shows its specifications, stock status, and warranty
        label, so you can shortlist without opening a dozen tabs.
      </>
    ),
  },
  {
    title: "Build a PC that fits together",
    body: (
      <>
        <Link href="/pc-builder" className={linkClass}>
          PC Builder
        </Link>{" "}
        walks you through the build slot by slot — processor, motherboard,
        memory, storage, graphics, power supply, and case. Compatibility cues
        appear as you choose parts and the running total updates in ৳, so a
        build is checked before it reaches your cart.
      </>
    ),
  },
];

const MORE_BLOCKS: InfoBlock[] = [
  {
    title: "Prices, offers and EMI",
    body: (
      <>
        Current markdowns sit on the{" "}
        <Link href="/offers" className={linkClass}>
          offers
        </Link>{" "}
        and{" "}
        <Link href="/deals" className={linkClass}>
          deals
        </Link>{" "}
        pages, with short-run{" "}
        <Link href="/flash-sale" className={linkClass}>
          flash sales
        </Link>{" "}
        when stock allows. Card and EMI options are presented at{" "}
        <Link href="/checkout" className={linkClass}>
          checkout
        </Link>
        . Figures shown in ৳ are display-only in this build and are never
        charged.
      </>
    ),
  },
  {
    title: "Warranty, delivery and returns",
    body: (
      <>
        <Link href="/warranty" className={linkClass}>
          Warranty
        </Link>{" "}
        coverage is stated on the product page before you buy,{" "}
        <Link href="/shipping" className={linkClass}>
          delivery
        </Link>{" "}
        zones and charges are shown before you confirm an order, and the{" "}
        <Link href="/returns" className={linkClass}>
          returns policy
        </Link>{" "}
        explains the window and the steps in plain language.
      </>
    ),
  },
  {
    title: "Brands in one place",
    body: (
      <>
        Compare the makers listed across laptops, components, and home
        electronics, then open a single{" "}
        <Link href="/brands" className={linkClass}>
          brand page
        </Link>{" "}
        to see everything stocked under that name. Brand and price filters work
        together on every{" "}
        <Link href="/shop" className={linkClass}>
          catalog
        </Link>{" "}
        listing.
      </>
    ),
  },
  {
    title: "Support and product requests",
    body: (
      <>
        The{" "}
        <Link href="/support" className={linkClass}>
          support desk
        </Link>{" "}
        is open 9:00–22:00 for order questions and after-sales help, and the{" "}
        <Link href="/faq" className={linkClass}>
          FAQ
        </Link>{" "}
        covers the usual ones. If a model you want is not listed yet, send a{" "}
        <Link href="/product-request" className={linkClass}>
          product request
        </Link>{" "}
        or reach us through the{" "}
        <Link href="/contact" className={linkClass}>
          contact form
        </Link>
        .
      </>
    ),
  },
];

function InfoBlockGrid({ blocks }: { blocks: InfoBlock[] }) {
  return (
    <div className="grid gap-x-12 gap-y-7 md:grid-cols-2">
      {blocks.map((block) => (
        <div key={block.title}>
          <h3 className="text-label font-semibold tracking-tight text-text">
            {block.title}
          </h3>
          <p className="mt-2 text-label leading-relaxed text-text-muted">
            {block.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function HomeStoreInfo({ html }: { html?: string }) {
  if (html && html.trim().length > 0) {
    return (
      <section aria-labelledby="home-store-info" className="scroll-mt-4">
        <HomeSectionHeader
          id="home-store-info"
          title="About Techno House"
          lede="What we sell, how we ship, and where to get help."
          actionHref="/about"
          actionLabel="Our story"
        />

        {/*
          Rendered in full, not behind the "Read more" fold the built-in copy
          uses. This is the homepage's main indexable prose and the reference
          shops (StarTech, Ryans, Dazzle) all leave theirs open; collapsing
          admin-written SEO copy would work against the reason it is here.
          Headings start at h2 — the page h1 is the hero's.
        */}
        <article className="th-rich-text mt-6 rounded-sm border border-border bg-surface px-5 py-7 sm:px-8 sm:py-9">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </section>
    );
  }

  return (
    <section aria-labelledby="home-store-info" className="scroll-mt-4">
      <HomeSectionHeader
        id="home-store-info"
        title="About Techno House"
        lede="What we sell, how we ship, and where to get help."
        actionHref="/about"
        actionLabel="Our story"
      />

      <div className="mt-6 rounded-sm border border-border bg-surface px-5 py-7 sm:px-8 sm:py-9">
        <p className="max-w-3xl text-body leading-relaxed text-text">
          Techno House is an online technology store for Bangladesh — laptops,
          desktop components, mobiles, and home electronics in one catalog.
          Every product page carries the full specification sheet, warranty
          terms, stock status, and a price in ৳, so you can compare properly
          before you spend.
        </p>

        <div className="mt-8">
          <InfoBlockGrid blocks={INTRO_BLOCKS} />
        </div>

        <details className="group mt-7 border-t border-border pt-6">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-label font-medium text-primary underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Read more</span>
            <span className="hidden group-open:inline">Show less</span>
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-6">
            <InfoBlockGrid blocks={MORE_BLOCKS} />
          </div>
        </details>
      </div>
    </section>
  );
}

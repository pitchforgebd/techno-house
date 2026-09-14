import Link from "next/link";
import { HomeSectionHeader } from "@/features/home/home-section-header";
import { TOP_CATEGORIES } from "@/lib/catalog/top-categories";

export function HomeCategories() {
  return (
    <section aria-labelledby="home-categories" className="scroll-mt-4">
      <HomeSectionHeader
        id="home-categories"
        title="Top categories"
        actionHref="/shop"
        actionLabel="See all categories"
      />
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {TOP_CATEGORIES.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full flex-col items-center justify-start gap-2.5 rounded-lg border border-border/70 bg-surface px-2 py-5 text-center shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:border-primary/40 hover:shadow-lg motion-safe:hover:-translate-y-1"
            >
              <Icon className="size-11 transition-transform duration-300 ease-out motion-safe:group-hover:scale-110" />
              <span className="text-label font-bold tracking-tight text-text transition-colors duration-300 group-hover:text-primary">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

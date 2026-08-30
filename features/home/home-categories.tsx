import Link from "next/link";
import { TOP_CATEGORIES } from "@/lib/catalog/top-categories";

export function HomeCategories() {
  return (
    <section aria-labelledby="home-categories" className="scroll-mt-4">
      <div className="flex items-stretch">
        <h2
          id="home-categories"
          className="flex shrink-0 items-center bg-text px-4 py-2 pr-7 text-label font-semibold tracking-tight text-primary-foreground [clip-path:polygon(0_0,calc(100%-0.85rem)_0,100%_100%,0_100%)]"
        >
          Top Categories
        </h2>
        <div className="flex min-w-0 flex-1 items-end justify-end border-b-2 border-text pb-1.5">
          <Link
            href="/shop"
            className="text-caption font-medium text-primary underline-offset-2 hover:underline"
          >
            See all categories
          </Link>
        </div>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-5 lg:grid-cols-10">
        {TOP_CATEGORIES.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex flex-col items-center gap-2 text-center text-text"
            >
              <span className="transition-colors group-hover:text-primary">
                <Icon />
              </span>
              <span className="text-label font-semibold tracking-tight group-hover:text-primary">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

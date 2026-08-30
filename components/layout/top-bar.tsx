import Link from "next/link";
import {
  UTILITY_BAR_CONTACT,
  UTILITY_BAR_LINKS,
} from "@/lib/catalog/primary-nav";

const linkClassName =
  "inline-flex min-h-8 items-center text-caption font-medium text-primary-foreground hover:underline";

export function TopBar() {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-catalog items-center justify-between gap-4 px-4 py-1.5">
        <ul
          aria-label="Contact"
          className="flex flex-wrap items-center gap-x-4 gap-y-1"
        >
          {UTILITY_BAR_CONTACT.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={linkClassName}>
                {item.label}
              </Link>
            </li>
          ))}
          <li className="hidden text-caption font-medium lg:block">
            Nationwide delivery
          </li>
        </ul>
        <ul
          aria-label="Store links"
          className="hidden flex-wrap items-center justify-end gap-x-4 gap-y-1 sm:flex"
        >
          {UTILITY_BAR_LINKS.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link href={item.href} className={linkClassName}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

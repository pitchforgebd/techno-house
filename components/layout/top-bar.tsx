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
      <div className="mx-auto flex max-w-catalog items-center justify-between gap-3 px-4 py-1.5">
        <ul
          aria-label="Contact"
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4"
        >
          {UTILITY_BAR_CONTACT.map((item) => {
            const shortLabel =
              item.label === "Support 9:00–22:00" ? "Support" : item.label;
            return (
              <li key={item.href}>
                <Link href={item.href} className={linkClassName}>
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="hidden text-caption font-medium lg:list-item">
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

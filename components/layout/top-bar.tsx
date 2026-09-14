import Link from "next/link";
import {
  Headset,
  Mail,
  Phone,
  Sparkles,
  Store,
  Tag,
  type LucideIcon,
} from "lucide-react";
import {
  type UtilityBarIcon,
} from "@/lib/catalog/primary-nav";
import {
  getStorefrontBranding,
} from "@/lib/business/storefront-branding";

const ICONS: Record<UtilityBarIcon, LucideIcon> = {
  phone: Phone,
  mail: Mail,
  support: Headset,
  offers: Tag,
  new: Sparkles,
  brands: Store,
};

/**
 * Contact details and quick links were one centred row of identical items,
 * which read as an undifferentiated strip. They are two different things —
 * one is how you reach the shop, the other is where to go next — so they
 * split to opposite ends the way a store top bar normally works.
 */
const contactClassName =
  "inline-flex min-h-7 items-center gap-1.5 rounded-sm px-1.5 text-caption font-bold tracking-tight text-header-text/90 transition-colors hover:text-header-text";

const linkClassName =
  "inline-flex min-h-7 items-center gap-1.5 rounded-sm px-2 text-caption font-bold tracking-tight text-header-text/80 transition-colors hover:bg-header-text/10 hover:text-header-text";

const iconClassName = "size-3.5 shrink-0 opacity-70";

export async function TopBar() {
  const branding = await getStorefrontBranding();
  type BarItem = {
    href: string;
    label: string;
    icon: UtilityBarIcon;
    external?: boolean;
  };

  const contacts: ReadonlyArray<BarItem> = [
    {
      href: branding.phoneHref,
      label: branding.phone,
      icon: "phone",
      external: branding.phoneHref.startsWith("tel:"),
    },
    {
      href: branding.emailHref,
      label: branding.supportEmail,
      icon: "mail",
      external: branding.emailHref.startsWith("mailto:"),
    },
  ];

  const links: ReadonlyArray<BarItem> = [
    { href: "/support", label: "Customer service", icon: "support" },
    { href: "/offers", label: "Offers", icon: "offers" },
    { href: "/shop?sort=newest", label: "New arrivals", icon: "new" },
    { href: "/brands", label: "Brands", icon: "brands" },
  ];

  function renderItem(item: BarItem, className: string) {
    const Icon = ICONS[item.icon];
    const body = (
      <>
        <Icon className={iconClassName} aria-hidden strokeWidth={1.75} />
        {item.label}
      </>
    );
    return item.external ? (
      <a href={item.href} className={className}>
        {body}
      </a>
    ) : (
      <Link href={item.href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <div className="hidden border-b border-header-text/10 bg-header-background text-header-text md:block">
      <div className="mx-auto flex max-w-catalog flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-1.5">
        <ul
          aria-label="Contact the store"
          className="flex flex-wrap items-center gap-x-1 gap-y-1"
        >
          {contacts.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              {renderItem(item, contactClassName)}
            </li>
          ))}
        </ul>

        <ul
          aria-label="Store links"
          className="flex flex-wrap items-center gap-x-0.5 gap-y-1"
        >
          {links.map((item, index) => (
            <li
              key={`${item.href}-${item.label}`}
              className="flex items-center"
            >
              {/* Hairline between links only — it separates the group's
                  items without boxing the whole bar in. */}
              {index > 0 ? (
                <span
                  aria-hidden
                  className="mr-0.5 h-3 w-px bg-header-text/15"
                />
              ) : null}
              {renderItem(item, linkClassName)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

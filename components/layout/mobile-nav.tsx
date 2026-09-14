"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Building2,
  ChevronDown,
  Headphones,
  Heart,
  Home,
  Menu,
  Monitor,
  Package,
  Sparkles,
  Store,
  Tag,
  User,
} from "lucide-react";
import { HeaderBuilderLink } from "@/components/layout/header-builder-link";
import { HEADER_ACTION_CLASS } from "@/components/layout/header-action-class";
import { Sheet } from "@/components/ui/sheet";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import {
  HEADER_LIST_LINKS,
  UTILITY_BAR_CONTACT,
  UTILITY_BAR_LINKS,
} from "@/lib/catalog/primary-nav";
import type { MegaBrand } from "@/lib/catalog/mega-menu";
import { cn } from "@/lib/cn";

export type MobileNavCategory = {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
};

const QUICK_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop all", icon: Store },
  { href: "/offers", label: "Offers", icon: Tag },
  { href: "/shop?sort=newest", label: "New arrivals", icon: Sparkles },
  { href: "/brands", label: "Brands", icon: Building2 },
] as const;

const LIST_ICONS = {
  "/wishlist": Heart,
  "/compare": ArrowLeftRight,
} as const;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 pb-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
      {children}
    </p>
  );
}

function NavRow({
  href,
  label,
  icon: Icon,
  onClick,
  trailing,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-label font-medium text-text transition-colors hover:bg-surface-muted"
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-primary">
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </Link>
  );
}

export function MobileNav({
  tree,
  brandsByCategory,
}: {
  tree: MobileNavCategory[];
  brandsByCategory: Record<string, MegaBrand[]>;
}) {
  const [open, setOpen] = useState(false);
  const session = useCustomerSession();

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (media.matches) {
        setOpen(false);
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={cn(HEADER_ACTION_CLASS, "shrink-0 md:hidden")}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="mobile-nav"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Menu</span>
      </button>

      <Sheet
        open={open}
        onClose={close}
        title="Browse Techno House"
        side="left"
        closeLabel="Close menu"
      >
        <div
          id="mobile-nav"
          className="flex max-h-[calc(100vh-5.5rem)] flex-col"
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4">
            {/* Account */}
            <section
              className="rounded-md border border-border bg-surface-muted/60 p-3"
              aria-label="Account"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  {session ? (
                    <>
                      <p className="truncate text-label font-semibold text-text">
                        {session.fullName}
                      </p>
                      <p className="truncate text-caption text-text-muted">
                        {session.phone || session.email}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-label font-semibold text-text">
                        Welcome
                      </p>
                      <p className="text-caption text-text-muted">
                        Sign in for orders, wishlist, and support
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {session ? (
                  <Link
                    href="/account"
                    onClick={close}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-primary px-3 text-label font-medium text-primary-foreground"
                  >
                    My account
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/account/login"
                      onClick={close}
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-primary px-3 text-label font-medium text-primary-foreground"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/account/register"
                      onClick={close}
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md border border-border bg-surface px-3 text-label font-medium text-text"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </section>

            {/* PC Builder CTA */}
            <section aria-label="PC Builder">
              <div className="flex items-start gap-3 rounded-md border border-secondary/25 bg-secondary/5 p-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary/15 text-secondary">
                  <Monitor className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-label font-semibold text-text">
                    Build a custom PC
                  </p>
                  <p className="mt-0.5 text-caption text-text-muted">
                    Choose components slot by slot with compatibility checks.
                  </p>
                  <div className="mt-3">
                    <HeaderBuilderLink
                      className="w-full justify-center"
                      onNavigate={close}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Quick links */}
            <section aria-labelledby="mobile-nav-quick">
              <SectionLabel>
                <span id="mobile-nav-quick">Quick links</span>
              </SectionLabel>
              <ul className="space-y-0.5">
                {QUICK_LINKS.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <NavRow
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      onClick={close}
                    />
                  </li>
                ))}
                {HEADER_LIST_LINKS.map((item) => {
                  const Icon =
                    LIST_ICONS[item.href as keyof typeof LIST_ICONS] ?? Package;
                  return (
                    <li key={item.href}>
                      <NavRow
                        href={item.href}
                        label={item.label}
                        icon={Icon}
                        onClick={close}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Categories */}
            <section aria-labelledby="mobile-nav-categories">
              <SectionLabel>
                <span id="mobile-nav-categories">Categories</span>
              </SectionLabel>
              <ul className="space-y-0.5">
                {tree.map((node) => {
                  const brands = brandsByCategory[node.slug] ?? [];
                  const nested =
                    node.children.length > 0 || brands.length > 0;

                  if (!nested) {
                    return (
                      <li key={node.slug}>
                        <NavRow
                          href={`/category/${node.slug}`}
                          label={node.name}
                          icon={Package}
                          onClick={close}
                        />
                      </li>
                    );
                  }

                  return (
                    <li key={node.slug}>
                      <details className="group rounded-md open:bg-surface-muted/40">
                        <summary
                          className={cn(
                            "flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-md px-3 py-2.5 text-label font-medium text-text transition-colors hover:bg-surface-muted",
                            "[&::-webkit-details-marker]:hidden",
                          )}
                        >
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-primary group-open:bg-primary/10">
                            <Package
                              className="size-4"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {node.name}
                          </span>
                          <ChevronDown
                            className="size-4 shrink-0 text-text-muted transition-transform group-open:rotate-180"
                            aria-hidden
                          />
                        </summary>
                        <ul className="mt-1 mb-2 ml-4 space-y-0.5 border-l border-border pl-3">
                          <li>
                            <Link
                              href={`/category/${node.slug}`}
                              className="block rounded-md px-2 py-2 text-label font-medium text-primary hover:bg-surface-muted"
                              onClick={close}
                            >
                              All {node.name}
                            </Link>
                          </li>
                          {node.children.map((child) => (
                            <li key={child.slug}>
                              <Link
                                href={`/category/${child.slug}`}
                                className="block rounded-md px-2 py-2 text-label text-text hover:bg-surface-muted"
                                onClick={close}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                          {brands.length > 0 ? (
                            <li className="pt-1">
                              <p className="px-2 pb-1 text-caption font-semibold text-text-muted">
                                Shop by brand
                              </p>
                              <ul className="space-y-0.5">
                                {brands.map((brand) => (
                                  <li key={brand.slug}>
                                    <Link
                                      href={`/category/${node.slug}?brand=${encodeURIComponent(brand.slug)}`}
                                      className="block rounded-md px-2 py-2 text-label text-text hover:bg-surface-muted"
                                      onClick={close}
                                    >
                                      {brand.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ) : null}
                        </ul>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Help */}
            <section aria-labelledby="mobile-nav-help">
              <SectionLabel>
                <span id="mobile-nav-help">Help & contact</span>
              </SectionLabel>
              <ul className="space-y-0.5">
                {UTILITY_BAR_CONTACT.map((item) => (
                  <li key={item.href}>
                    <NavRow
                      href={item.href}
                      label={item.label}
                      icon={Headphones}
                      onClick={close}
                    />
                  </li>
                ))}
                {UTILITY_BAR_LINKS.filter((item) => item.label === "Help").map(
                  (item) => (
                    <li key={`${item.href}-${item.label}`}>
                      <NavRow
                        href={item.href}
                        label={item.label}
                        icon={Headphones}
                        onClick={close}
                      />
                    </li>
                  ),
                )}
              </ul>
            </section>
          </div>
        </div>
      </Sheet>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeaderBuilderLink } from "@/components/layout/header-builder-link";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import {
  HEADER_LIST_LINKS,
  PRIMARY_NAV_END,
  PRIMARY_NAV_START,
  UTILITY_BAR_LINKS,
} from "@/lib/catalog/primary-nav";
import type { MegaBrand } from "@/lib/catalog/mega-menu";
import { cn } from "@/lib/cn";

export type MobileNavCategory = {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
};

const linkClassName =
  "block rounded-md px-3 py-2 text-label font-medium text-text hover:bg-surface-muted";

export function MobileNav({
  tree,
  brandsByCategory,
}: {
  tree: MobileNavCategory[];
  brandsByCategory: Record<string, MegaBrand[]>;
}) {
  const [open, setOpen] = useState(false);

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
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 shrink-0 md:hidden"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
      >
        Menu
      </Button>
      <Sheet open={open} onClose={close} title="Menu" side="left">
        <nav
          id="mobile-nav"
          aria-label="Product categories"
          className="max-h-[calc(100vh-5rem)] overflow-y-auto"
        >
          <ul className="flex flex-col gap-1">
            {PRIMARY_NAV_START.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={linkClassName}
                  onClick={close}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {tree.map((node) => {
              const brands = brandsByCategory[node.slug] ?? [];
              const nested = node.children.length > 0 || brands.length > 0;
              return (
                <li key={node.slug}>
                  {nested ? (
                    <details>
                      <summary
                        className={cn(
                          linkClassName,
                          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
                        )}
                      >
                        {node.name}
                      </summary>
                      <ul className="mb-1 ml-2 border-l border-border pl-2">
                        <li>
                          <Link
                            href={`/category/${node.slug}`}
                            className={linkClassName}
                            onClick={close}
                          >
                            All {node.name}
                          </Link>
                        </li>
                        {node.children.map((child) => (
                          <li key={child.slug}>
                            <Link
                              href={`/category/${child.slug}`}
                              className={linkClassName}
                              onClick={close}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                        {brands.length > 0 ? (
                          <li>
                            <p className="px-3 pt-2 pb-1 text-caption font-semibold text-text-muted">
                              Shop by brand
                            </p>
                            <ul>
                              {brands.map((brand) => (
                                <li key={brand.slug}>
                                  <Link
                                    href={`/category/${node.slug}?brand=${encodeURIComponent(brand.slug)}`}
                                    className={linkClassName}
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
                  ) : (
                    <Link
                      href={`/category/${node.slug}`}
                      className={linkClassName}
                      onClick={close}
                    >
                      {node.name}
                    </Link>
                  )}
                </li>
              );
            })}
            {PRIMARY_NAV_END.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={linkClassName}
                  onClick={close}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className={linkClassName} onClick={close}>
                Shop
              </Link>
            </li>
            <li className="px-3 py-2">
              <HeaderBuilderLink className="w-full" onNavigate={close} />
            </li>
            {HEADER_LIST_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={linkClassName}
                  onClick={close}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {UTILITY_BAR_LINKS.filter(
              (item) =>
                item.label === "New arrivals" || item.label === "Brands",
            ).map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className={linkClassName}
                  onClick={close}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Sheet>
    </>
  );
}

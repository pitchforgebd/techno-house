"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { IconHome } from "@/components/layout/chrome-icons";
import {
  hasMegaMenu,
  type MegaMenuLink,
  type MegaMenuPanel,
} from "@/lib/catalog/mega-menu";
import { cn } from "@/lib/cn";

const CLOSE_DELAY_MS = 140;

const triggerClassName =
  "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-label font-medium text-text hover:bg-surface";

export function CategoryMegaNav({
  panels,
  startLinks,
  endLinks,
}: {
  panels: MegaMenuPanel[];
  startLinks: ReadonlyArray<{ href: string; label: string }>;
  endLinks: ReadonlyArray<{ href: string; label: string }>;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenSlug(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    };
  }, []);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpenSlug(null);
    }, CLOSE_DELAY_MS);
  }

  function openPanel(slug: string) {
    cancelClose();
    setOpenSlug(slug);
  }

  const openPanelData = panels.find((panel) => panel.slug === openSlug) ?? null;

  return (
    <div
      className="relative"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        ) {
          return;
        }
        setOpenSlug(null);
      }}
    >
      <div className="mx-auto flex max-w-catalog items-center px-4 py-1">
        <ul className="flex shrink-0 items-center">
          {startLinks.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={triggerClassName}
                aria-label={item.label === "Home" ? "Home" : undefined}
              >
                {item.href === "/" ? (
                  <>
                    <IconHome className="size-5" />
                    <span className="sr-only">{item.label}</span>
                  </>
                ) : (
                  item.label
                )}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="th-scroll-hide flex min-w-0 flex-1 flex-nowrap items-center overflow-x-auto">
          {panels.map((panel) => {
            const mega = hasMegaMenu(panel);
            const isOpen = openSlug === panel.slug;
            const panelDomId = `${navId}-${panel.slug}`;

            if (!mega) {
              return (
                <li key={panel.slug} className="shrink-0">
                  <Link href={panel.href} className={triggerClassName}>
                    {panel.name}
                  </Link>
                </li>
              );
            }

            return (
              <li key={panel.slug} className="shrink-0">
                <Link
                  href={panel.href}
                  className={cn(triggerClassName, isOpen && "bg-surface")}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  aria-controls={panelDomId}
                  onMouseEnter={() => openPanel(panel.slug)}
                  onFocus={() => openPanel(panel.slug)}
                >
                  {panel.name}
                </Link>
              </li>
            );
          })}
          {endLinks.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link href={item.href} className={triggerClassName}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {openPanelData && hasMegaMenu(openPanelData) ? (
        <MegaPanel
          id={`${navId}-${openPanelData.slug}`}
          panel={openPanelData}
          onEnter={cancelClose}
        />
      ) : null}
    </div>
  );
}

function MegaPanel({
  id,
  panel,
  onEnter,
}: {
  id: string;
  panel: MegaMenuPanel;
  onEnter: () => void;
}) {
  const [flyoutHref, setFlyoutHref] = useState<string | null>(null);

  return (
    <div
      id={id}
      role="region"
      aria-label={`${panel.name} categories`}
      className="absolute inset-x-0 top-full z-40 border-b border-border bg-surface-muted shadow-md"
      onMouseEnter={onEnter}
    >
      <div
        className={cn(
          "mx-auto grid max-w-catalog gap-6 px-4 py-5",
          panel.columns.length >= 4
            ? "grid-cols-4"
            : panel.columns.length === 3
              ? "grid-cols-3"
              : "grid-cols-2",
        )}
      >
        {panel.columns.map((column) => (
          <div key={column.title}>
            <p className="mb-2 text-label font-semibold text-text">
              {column.title}
            </p>
            <ul className="space-y-0.5">
              {column.links.map((link) => (
                <MegaRow
                  key={`${link.href}-${link.label}`}
                  link={link}
                  flyoutOpen={flyoutHref === `${link.href}-${link.label}`}
                  onFlyoutEnter={() =>
                    setFlyoutHref(
                      link.children?.length
                        ? `${link.href}-${link.label}`
                        : null,
                    )
                  }
                  onFlyoutLeave={() => setFlyoutHref(null)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MegaRow({
  link,
  flyoutOpen,
  onFlyoutEnter,
  onFlyoutLeave,
}: {
  link: MegaMenuLink;
  flyoutOpen: boolean;
  onFlyoutEnter: () => void;
  onFlyoutLeave: () => void;
}) {
  const nested = link.children && link.children.length > 0;

  return (
    <li
      className="relative"
      onMouseEnter={nested ? onFlyoutEnter : undefined}
      onMouseLeave={nested ? onFlyoutLeave : undefined}
    >
      <Link
        href={link.href}
        className="flex min-h-9 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-label text-text hover:bg-surface"
      >
        <span>{link.label}</span>
        {nested ? (
          <span aria-hidden="true" className="text-text-muted">
            ›
          </span>
        ) : null}
      </Link>
      {nested && flyoutOpen ? (
        <ul className="absolute top-0 left-full z-50 ml-1 min-w-44 rounded-md border border-border bg-surface p-2 shadow-md">
          {link.children?.map((child) => (
            <li key={`${child.href}-${child.label}`}>
              <Link
                href={child.href}
                className="block rounded-md px-2 py-1.5 text-label text-text hover:bg-surface-muted"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

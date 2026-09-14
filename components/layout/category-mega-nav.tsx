"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { IconHome } from "@/components/layout/chrome-icons";
import {
  hasMegaMenu,
  type MegaMenuLink,
  type MegaMenuPanel,
} from "@/lib/catalog/mega-menu";
import { cn } from "@/lib/cn";

const CLOSE_DELAY_MS = 140;

/**
 * The row scrolls horizontally with a hidden scrollbar, so anything past the
 * container edge is simply out of sight rather than wrapping. Bold is wider
 * than medium at the same size, which pushed the last categories off screen —
 * so the type steps down from 0.875rem to 0.8125rem and the horizontal
 * padding and icon gap tighten to win the width back and then some.
 */
const triggerClassName =
  "relative inline-flex min-h-10 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-sm px-2.5 py-2 text-[0.8125rem] font-bold tracking-tight text-primary-foreground/90 transition-colors duration-200 hover:bg-primary-foreground/10 hover:text-primary-foreground";

const triggerOpenClassName =
  "bg-primary-foreground/10 text-primary-foreground";

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
        {/*
          `justify-between` spreads the categories across whatever room is
          left instead of leaving a ragged gap after the last one. It only
          acts on free space, so when the row is wider than the bar it has no
          effect and the list scrolls exactly as before.
        */}
        <ul className="th-scroll-hide flex min-w-0 flex-1 flex-nowrap items-center justify-between overflow-x-auto">
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
                  className={cn(triggerClassName, isOpen && triggerOpenClassName)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  aria-controls={panelDomId}
                  onMouseEnter={() => openPanel(panel.slug)}
                  onFocus={() => openPanel(panel.slug)}
                >
                  {panel.name}
                  <ChevronDown
                    aria-hidden
                    strokeWidth={2}
                    className={cn(
                      "size-3.5 text-current opacity-60 transition-transform duration-200",
                      isOpen && "rotate-180 opacity-100",
                    )}
                  />
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
      className="th-mega-panel absolute inset-x-0 top-full z-40 border-b border-border bg-surface shadow-[0_18px_40px_-12px_rgba(14,26,36,0.28)]"
      onMouseEnter={onEnter}
    >
      <div
        aria-hidden
        className="h-px w-full bg-linear-to-r from-transparent via-primary/40 to-transparent"
      />
      <div
        className={cn(
          "mx-auto grid max-w-catalog gap-x-8 gap-y-6 px-4 py-6",
          panel.columns.length >= 4
            ? "grid-cols-4"
            : panel.columns.length === 3
              ? "grid-cols-3"
              : "grid-cols-2",
        )}
      >
        {panel.columns.map((column, index) => {
          // The column holding an open flyout is lifted above its siblings, so
          // the flyout stays on top even if a column is still mid-animation
          // (and therefore still its own stacking context).
          const ownsFlyout = column.links.some(
            (link) => `${link.href}-${link.label}` === flyoutHref,
          );
          return (
          <div
            key={column.title}
            className={cn("th-mega-col", ownsFlyout && "relative z-10")}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <p className="mb-3 border-b border-border/70 pb-2 text-[0.7rem] font-bold tracking-[0.14em] text-text-muted uppercase">
              {column.title}
            </p>
            {/* Capped so a 2-column panel doesn't stretch each row (and its
                chevron) across half the viewport. */}
            <ul className="max-w-xs space-y-0.5">
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
          );
        })}
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
        className={cn(
          "group/row flex min-h-9 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-label text-text/85 transition-colors duration-150 hover:bg-primary-soft/60 hover:text-primary",
          flyoutOpen && "bg-primary-soft/60 text-primary",
        )}
      >
        <span className="truncate transition-transform duration-150 group-hover/row:translate-x-0.5">
          {link.label}
        </span>
        {nested ? (
          <ChevronRight
            aria-hidden
            strokeWidth={2}
            className="size-3.5 shrink-0 text-text-muted transition-[color,transform] duration-150 group-hover/row:translate-x-0.5 group-hover/row:text-primary"
          />
        ) : null}
      </Link>
      {nested && flyoutOpen ? (
        <ul className="th-mega-flyout absolute top-0 left-full z-50 ml-2 min-w-48 rounded-lg border border-border bg-surface p-2 shadow-[0_16px_32px_-10px_rgba(14,26,36,0.3)]">
          {link.children?.map((child) => (
            <li key={`${child.href}-${child.label}`}>
              <Link
                href={child.href}
                className="block rounded-md px-2.5 py-1.5 text-label text-text/85 transition-colors duration-150 hover:bg-primary-soft/60 hover:text-primary"
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

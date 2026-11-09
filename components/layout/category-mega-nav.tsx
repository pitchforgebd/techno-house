"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavMenu } from "@/components/layout/use-nav-menu";
import {
  hasMegaMenu,
  type MegaMenuLink,
  type MegaMenuPanel,
} from "@/lib/catalog/mega-menu";
import type { NavTrigger } from "@/lib/catalog/nav-menu";
import { cn } from "@/lib/cn";

const CLOSE_DELAY_MS = 140;
/** Grace period before a brand flyout closes, so the pointer can cross from
 * its row into the flyout without it vanishing on the way. */
const FLYOUT_CLOSE_DELAY_MS = 220;
/** While one flyout is open, hovering a different row waits this long before
 * switching — a diagonal move toward the open flyout brushes past sibling
 * rows, and those shouldn't steal it. */
const FLYOUT_SWITCH_DELAY_MS = 120;
/** Pointer travel needed before its direction is trusted for menu aim. */
const AIM_MIN_STEP_PX = 5;
/** How far above/below the flyout a heading still counts as "toward it". */
const AIM_SLACK_PX = 24;

/**
 * Whether the move `from` -> `to`, extended in a straight line, reaches the
 * flyout's near vertical edge (with some slack above and below).
 */
function isHeadingToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  rect: DOMRect,
): boolean {
  const nearX = rect.left >= from.x ? rect.left : rect.right;
  const toEdge = nearX - from.x;
  const stepX = to.x - from.x;
  if (toEdge === 0 || stepX === 0 || Math.sign(stepX) !== Math.sign(toEdge)) {
    return false;
  }
  const hitY = from.y + ((to.y - from.y) * toEdge) / stepX;
  return hitY >= rect.top - AIM_SLACK_PX && hitY <= rect.bottom + AIM_SLACK_PX;
}

/**
 * The row scrolls horizontally with a hidden scrollbar, so anything past the
 * container edge is simply out of sight rather than wrapping. There are now
 * 17 department panels (Star Tech-style taxonomy) — no dropdown chevron on
 * the trigger itself (the flyout opening is signal enough, and every pixel
 * back from it goes toward fitting more labels), and the type is smaller and
 * tighter than it looks like it should need to be, because it does.
 */
const triggerClassName =
  "relative inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-sm px-2 py-1.5 text-[0.75rem] font-bold tracking-tight text-primary-foreground/90 transition-colors duration-200 hover:bg-primary-foreground/10 hover:text-primary-foreground";

const triggerOpenClassName =
  "bg-primary-foreground/10 text-primary-foreground";

export function CategoryMegaNav({
  triggers,
  startLinks,
  endLinks,
}: {
  /** Department links only — the panels load on first hover/focus. */
  triggers: NavTrigger[];
  startLinks: ReadonlyArray<{ href: string; label: string }>;
  endLinks: ReadonlyArray<{ href: string; label: string }>;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const { data, load } = useNavMenu();
  const panels = data?.panels ?? [];
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
      closeTimer.current = null;
      setOpenSlug(null);
    }, CLOSE_DELAY_MS);
  }

  // A long brand flyout hangs below the panel, so heading for its lower
  // rows leaves this container; the panel's menu aim calls this to push a
  // pending close back while the pointer is still on its way there.
  const extendPendingClose = useCallback(() => {
    if (!closeTimer.current) {
      return;
    }
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setOpenSlug(null);
    }, CLOSE_DELAY_MS);
  }, []);

  function openPanel(slug: string) {
    cancelClose();
    setOpenSlug(slug);
  }

  const openPanelData = panels.find((panel) => panel.slug === openSlug) ?? null;

  return (
    <div
      className="relative"
      onMouseLeave={scheduleClose}
      onMouseEnter={() => {
        cancelClose();
        // Fetch the panels as soon as the pointer reaches the bar, so they
        // are usually there by the time it settles on a department.
        load();
      }}
      onFocus={load}
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
        {startLinks.length > 0 ? (
          <ul className="flex shrink-0 items-center">
            {startLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={triggerClassName}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {/*
          `justify-between` spreads the categories across whatever room is
          left instead of leaving a ragged gap after the last one. It only
          acts on free space, so when the row is wider than the bar it has no
          effect and the list scrolls exactly as before.
        */}
        <ul className="th-scroll-hide flex min-w-0 flex-1 flex-nowrap items-center justify-between overflow-x-auto">
          {triggers.map((panel) => {
            const mega = panel.hasMenu;
            const isOpen = openSlug === panel.slug && Boolean(data);
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
          onAimAtFlyout={extendPendingClose}
        />
      ) : null}
    </div>
  );
}

function MegaPanel({
  id,
  panel,
  onEnter,
  onAimAtFlyout,
}: {
  id: string;
  panel: MegaMenuPanel;
  onEnter: () => void;
  /** Called while the pointer is heading for the open flyout. */
  onAimAtFlyout: () => void;
}) {
  const [flyoutHref, setFlyoutHref] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const flyoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The close/switch waiting to happen, so pointer movement toward the open
  // flyout can keep re-arming it (see the menu-aim effect below).
  const pendingFlyout = useRef<{ next: string | null; delay: number } | null>(
    null,
  );
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (flyoutTimer.current) {
        clearTimeout(flyoutTimer.current);
      }
    };
  }, []);

  function clearFlyoutTimer() {
    if (flyoutTimer.current) {
      clearTimeout(flyoutTimer.current);
      flyoutTimer.current = null;
    }
    pendingFlyout.current = null;
  }

  const scheduleFlyout = useCallback((next: string | null, delay: number) => {
    if (flyoutTimer.current) {
      clearTimeout(flyoutTimer.current);
    }
    pendingFlyout.current = { next, delay };
    flyoutTimer.current = setTimeout(() => {
      flyoutTimer.current = null;
      pendingFlyout.current = null;
      setFlyoutHref(next);
    }, delay);
  }, []);

  function enterFlyoutRow(key: string) {
    if (flyoutHref === null || flyoutHref === key) {
      clearFlyoutTimer();
      setFlyoutHref(key);
      return;
    }
    scheduleFlyout(key, FLYOUT_SWITCH_DELAY_MS);
  }

  function leaveFlyoutRow() {
    scheduleFlyout(null, FLYOUT_CLOSE_DELAY_MS);
  }

  // "Menu aim": rows are wide and the flyout sits past their far edge, so a
  // natural diagonal move toward it crosses sibling rows (and, for a long
  // flyout, the page below the panel) for longer than any sane fixed delay.
  // While the pointer keeps heading for the open flyout, pending closes —
  // this panel's and the whole menu's — are pushed back; they fire once the
  // pointer stops or turns away. Listens on window because the path can run
  // outside the panel.
  useEffect(() => {
    function onMove(event: MouseEvent) {
      const point = { x: event.clientX, y: event.clientY };
      const previous = lastPointer.current;
      // Direction from single-pixel steps is mostly noise; judge it over a
      // few pixels of travel instead.
      if (
        previous &&
        Math.hypot(point.x - previous.x, point.y - previous.y) <
          AIM_MIN_STEP_PX
      ) {
        return;
      }
      lastPointer.current = point;
      const flyout = panelRef.current?.querySelector(".th-mega-flyout");
      if (
        !previous ||
        !flyout ||
        !isHeadingToward(previous, point, flyout.getBoundingClientRect())
      ) {
        return;
      }
      onAimAtFlyout();
      const pending = pendingFlyout.current;
      if (pending) {
        scheduleFlyout(pending.next, pending.delay);
      }
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [onAimAtFlyout, scheduleFlyout]);

  return (
    <div
      ref={panelRef}
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
          // A flyout in the rightmost column has nowhere to open but off the
          // edge of the panel (or the viewport), so it opens leftward there
          // instead — every other column keeps opening to the right. A lone
          // column sits at the panel's left edge (the grid is never narrower
          // than 2 tracks), so it must open right or it lands off-screen.
          const flyoutAlign =
            panel.columns.length > 1 && index === panel.columns.length - 1
              ? "left"
              : "right";
          return (
          <div
            key={`${column.title}-${index}`}
            className={cn("th-mega-col", ownsFlyout && "relative z-10")}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            {/* A title-less column is a continuation of the previous one
                (a long list split for legibility, not a new group) — an
                invisible placeholder keeps every column's links starting at
                the same height without drawing a second header. */}
            {column.title ? (
              <p className="mb-3 border-b border-border/70 pb-2 text-[0.7rem] font-bold tracking-[0.14em] text-text-muted uppercase">
                {column.title}
              </p>
            ) : (
              <p aria-hidden className="mb-3 pb-2 text-[0.7rem]">
                &nbsp;
              </p>
            )}
            {/* Capped so a 2-column panel doesn't stretch each row (and its
                chevron) across half the viewport. */}
            <ul className="max-w-xs space-y-0.5">
              {column.links.map((link) => (
                <MegaRow
                  key={`${link.href}-${link.label}`}
                  link={link}
                  flyoutAlign={flyoutAlign}
                  flyoutOpen={flyoutHref === `${link.href}-${link.label}`}
                  onFlyoutEnter={() =>
                    enterFlyoutRow(`${link.href}-${link.label}`)
                  }
                  onFlyoutLeave={leaveFlyoutRow}
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
  flyoutAlign,
  flyoutOpen,
  onFlyoutEnter,
  onFlyoutLeave,
}: {
  link: MegaMenuLink;
  /** Which side the flyout opens on — "left" flips it for a rightmost
   * column, so it can't spill past the panel or the viewport edge. */
  flyoutAlign: "left" | "right";
  flyoutOpen: boolean;
  onFlyoutEnter: () => void;
  onFlyoutLeave: () => void;
}) {
  const nested = link.children && link.children.length > 0;
  const Chevron = flyoutAlign === "left" ? ChevronLeft : ChevronRight;

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
          <Chevron
            aria-hidden
            strokeWidth={2}
            className="size-3.5 shrink-0 text-text-muted transition-[color,transform] duration-150 group-hover/row:translate-x-0.5 group-hover/row:text-primary"
          />
        ) : null}
      </Link>
      {nested && flyoutOpen ? (
        // The gap between row and flyout is padding on this wrapper, not a
        // margin: it stays inside the <li>, so crossing it never fires the
        // row's mouseleave (a margin gap closed the flyout mid-move).
        <div
          className={cn(
            "absolute top-0 z-50",
            flyoutAlign === "left" ? "right-full pr-2" : "left-full pl-2",
          )}
        >
          <ul className="th-mega-flyout min-w-48 rounded-lg border border-border bg-surface p-2 shadow-[0_16px_32px_-10px_rgba(14,26,36,0.3)]">
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
        </div>
      ) : null}
    </li>
  );
}

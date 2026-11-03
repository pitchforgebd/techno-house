"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { adminFormControlClass } from "@/features/admin/products/admin-product-form-primitives";
import {
  filterSearchableOptions,
  findMatchRange,
  type SearchableOption,
} from "@/lib/admin/searchable-options";
import { cn } from "@/lib/cn";

/** Tallest the list may grow before it scrolls. */
const LIST_MAX_HEIGHT_PX = 288;
/** Search box + padding above the list. */
const PANEL_CHROME_PX = 56;
/** Below this much room under the trigger the list opens upward instead. */
const MIN_ROOM_BELOW_PX = 180;
/** Gap kept between the panel and the viewport edge. */
const VIEWPORT_GAP_PX = 8;

type PanelPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  listMaxHeight: number;
};

/**
 * A select with a search box (AD-387): click it (or press Enter/Space/
 * ArrowDown), type a letter or any keyword, and the matching options are
 * listed best-first (see `filterSearchableOptions`). Keyboard: ArrowUp/Down
 * move, Enter picks, Escape closes.
 *
 * The list is portalled to <body> with fixed positioning because the admin
 * form cards clip overflow; it follows the trigger on scroll/resize and opens
 * upward when there is no room below.
 */
export function AdminSearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  emptyOptionLabel,
  searchPlaceholder = "Type to search…",
  noMatchText = "No match",
  disabled,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  /** Shown on the trigger when nothing is picked. */
  placeholder: string;
  /** When set, a pickable "" option at the top of the list (e.g. "None"). */
  emptyOptionLabel?: string;
  searchPlaceholder?: string;
  noMatchText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const listId = `${autoId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;
  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    const matches = filterSearchableOptions(options, query);
    // The "none" choice only makes sense while browsing, not as a search hit.
    return emptyOptionLabel && !searching
      ? [{ value: "", label: emptyOptionLabel }, ...matches]
      : matches;
  }, [options, query, emptyOptionLabel, searching]);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - VIEWPORT_GAP_PX;
    const above = rect.top - VIEWPORT_GAP_PX;
    const width = Math.max(rect.width, 240);
    const left = Math.min(rect.left, window.innerWidth - width - VIEWPORT_GAP_PX);
    // Prefer opening downward, shortening the list to fit: an upward panel
    // is anchored by its bottom, so its search box shifts as results shrink.
    if (below < MIN_ROOM_BELOW_PX && above > below) {
      setPosition({
        left,
        width,
        bottom: window.innerHeight - rect.top + 4,
        listMaxHeight: Math.min(LIST_MAX_HEIGHT_PX, above - PANEL_CHROME_PX),
      });
    } else {
      setPosition({
        left,
        width,
        top: rect.bottom + 4,
        listMaxHeight: Math.min(LIST_MAX_HEIGHT_PX, below - PANEL_CHROME_PX),
      });
    }
  }, []);

  function openList() {
    if (disabled) {
      return;
    }
    setQuery("");
    const current = options.findIndex((option) => option.value === value);
    setActiveIndex(
      current === -1 ? 0 : current + (emptyOptionLabel ? 1 : 0),
    );
    place();
    setOpen(true);
  }

  function closeList(refocus: boolean) {
    setOpen(false);
    setQuery("");
    if (refocus) {
      triggerRef.current?.focus();
    }
  }

  function pick(next: string) {
    onChange(next);
    closeList(true);
  }

  useLayoutEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setQuery("");
    }
    function onReflow() {
      place();
    }
    document.addEventListener("mousedown", onPointerDown);
    // Capture: the admin shell scrolls an inner container, not the window.
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) {
      return;
    }
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      !open &&
      (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      openList();
    }
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      // Never let Enter submit the product form from inside the search box.
      event.preventDefault();
      const option = visible[activeIndex];
      if (option) {
        pick(option.value);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeList(true);
    } else if (event.key === "Tab") {
      closeList(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          adminFormControlClass,
          "flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-70",
          className,
        )}
      >
        <span
          className={cn("truncate", !selected && "text-neutral-400")}
        >
          {selected
            ? selected.label
            : value === "" && emptyOptionLabel
              ? emptyOptionLabel
              : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-neutral-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                left: position.left,
                width: position.width,
                top: position.top,
                bottom: position.bottom,
              }}
              className="z-[200] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg"
            >
              <div className="relative border-b border-neutral-100 p-2">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400"
                />
                <input
                  ref={searchRef}
                  type="text"
                  role="searchbox"
                  aria-controls={listId}
                  aria-activedescendant={
                    visible[activeIndex]
                      ? `${listId}-${activeIndex}`
                      : undefined
                  }
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  className={cn(adminFormControlClass, "pl-8")}
                />
              </div>
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-labelledby={triggerId}
                style={{ maxHeight: Math.max(position.listMaxHeight, 96) }}
                className="overflow-y-auto py-1"
              >
                {visible.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-neutral-500">
                    {noMatchText}
                  </li>
                ) : (
                  visible.map((option, index) => {
                    const isSelected = option.value === value;
                    const range = findMatchRange(option.label, query);
                    return (
                      <li
                        key={option.value || "__empty__"}
                        id={`${listId}-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActiveIndex(index)}
                        // mousedown, not click: keeps focus in the search box
                        // until the pick closes the list.
                        onMouseDown={(event) => {
                          event.preventDefault();
                          pick(option.value);
                        }}
                        style={
                          searching
                            ? undefined
                            : { paddingLeft: 12 + (option.depth ?? 0) * 14 }
                        }
                        className={cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-neutral-700",
                          index === activeIndex && "bg-[#3897f0]/10",
                          isSelected && "font-medium text-[#1f6fc4]",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {range ? (
                            <>
                              {option.label.slice(0, range.start)}
                              <mark className="rounded-sm bg-amber-100 text-inherit">
                                {option.label.slice(range.start, range.end)}
                              </mark>
                              {option.label.slice(range.end)}
                            </>
                          ) : (
                            option.label
                          )}
                        </span>
                        {option.hint ? (
                          <span className="max-w-[45%] shrink-0 truncate text-xs text-neutral-400">
                            {option.hint}
                          </span>
                        ) : null}
                        {isSelected ? (
                          <Check
                            aria-hidden
                            className="size-3.5 shrink-0 text-[#1f6fc4]"
                          />
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

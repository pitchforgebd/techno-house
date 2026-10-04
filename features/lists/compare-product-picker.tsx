"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchCompareCandidates } from "@/features/lists/actions";
import {
  COMPARE_SEARCH_MAX_RESULTS,
  COMPARE_SEARCH_MIN_CHARS,
  filterCandidates,
  nextActiveIndex,
  pickerMode,
  type CompareCandidate,
} from "@/lib/catalog/compare-search";
import { cn } from "@/lib/cn";

/** How long typing must pause before the whole category is searched. */
const SEARCH_DELAY_MS = 300;

type RemoteResult = {
  key: string;
  items: CompareCandidate[];
  failed: boolean;
};

/**
 * Searchable product picker for the compare page (AD-358).
 *
 * Opening it shows the starter list for the chosen type; typing filters that
 * list at once, and from three characters it searches the WHOLE type on the
 * server (the starter list is one page of at most 48 products). Picking a
 * product calls `onSelect` and clears the box. The list opens in the page flow
 * under the box, not as a floating layer, because the compare table scrolls
 * sideways and would clip a floating one.
 *
 * Keyboard: ArrowDown/ArrowUp move, Enter picks (or the only match), Escape
 * closes. Mount it with `key={category}` so a new type starts fresh.
 */
export function CompareProductPicker({
  id,
  label,
  categorySlug,
  items,
  total,
  excluded,
  busy,
  inputClassName,
  onSelect,
}: {
  id: string;
  label: string;
  /** "" until a product type is chosen. */
  categorySlug: string;
  /** Starter list for the type; may include products already being compared. */
  items: CompareCandidate[];
  /** Products in the whole type. */
  total: number;
  /** Slugs already in the comparison — never offered again. */
  excluded: ReadonlySet<string>;
  /** True while an add is in progress. */
  busy: boolean;
  inputClassName: string;
  onSelect: (slug: string) => void;
}) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<RemoteResult | null>(null);

  const text = query.trim();
  const mode = pickerMode(text);
  const disabled = !categorySlug || busy;

  // The search answer is tagged with what it answers, so "searching" and the
  // visible options are worked out while rendering (no state set in the effect).
  const remoteKey = `${categorySlug}|${text}`;
  const remoteReady = mode === "remote" && remote?.key === remoteKey;
  const searching = mode === "remote" && !remoteReady;
  const options: CompareCandidate[] =
    mode === "remote"
      ? remoteReady
        ? remote.items.filter((item) => !excluded.has(item.slug))
        : []
      : filterCandidates(items, text, excluded);
  const activeIndex = active >= 0 && active < options.length ? active : -1;

  useEffect(() => {
    if (!categorySlug || pickerMode(text) !== "remote") {
      return;
    }
    let cancelled = false;
    const key = `${categorySlug}|${text}`;
    const timer = window.setTimeout(async () => {
      let found: CompareCandidate[] = [];
      let failed = false;
      try {
        found = await searchCompareCandidates(categorySlug, text);
      } catch {
        failed = true;
      }
      if (!cancelled) {
        setRemote({ key, items: found, failed });
      }
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [categorySlug, text]);

  function choose(item: CompareCandidate) {
    onSelect(item.slug);
    setQuery("");
    setActive(-1);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive(nextActiveIndex(activeIndex, options.length, event.key));
      return;
    }
    if (event.key === "Enter") {
      if (!open) {
        return;
      }
      const target =
        activeIndex >= 0
          ? options[activeIndex]
          : options.length === 1
            ? options[0]
            : undefined;
      if (target) {
        event.preventDefault();
        choose(target);
      }
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActive(-1);
      } else if (query) {
        setQuery("");
      }
    }
  }

  let status: string;
  if (mode === "remote") {
    if (searching) {
      status = "Searching…";
    } else if (remote?.failed) {
      status = "Search failed. Please try again.";
    } else if (options.length === 0) {
      status = `No products match “${text}”.`;
    } else if ((remote?.items.length ?? 0) >= COMPARE_SEARCH_MAX_RESULTS) {
      status = `Showing the first ${COMPARE_SEARCH_MAX_RESULTS} matches — type more to narrow down.`;
    } else {
      status = `${options.length} ${options.length === 1 ? "match" : "matches"} found.`;
    }
  } else if (mode === "local") {
    status =
      options.length > 0
        ? `Type ${COMPARE_SEARCH_MIN_CHARS} or more characters to search all ${total} products.`
        : `No match in the list — type ${COMPARE_SEARCH_MIN_CHARS} or more characters to search all ${total} products.`;
  } else if (items.length === 0) {
    status = "No products in this type yet.";
  } else if (total > items.length) {
    status = `Showing ${items.length} of ${total} — type to search all.`;
  } else {
    status = `${total} ${total === 1 ? "product" : "products"}.`;
  }

  return (
    <div
      ref={wrapperRef}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open && !disabled}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          value={query}
          disabled={disabled}
          placeholder={categorySlug ? "Type Product Name" : "Select a type first"}
          className={cn(inputClassName, "pr-10")}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <Search
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
        />
      </div>

      {open && !disabled ? (
        <div className="mt-1.5 overflow-hidden rounded-md border border-border bg-surface">
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto"
          >
            {options.map((item, index) => (
              <li
                key={item.slug}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // Keeps focus in the box, so picking does not first close the list.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-label text-text",
                  index === activeIndex && "bg-primary-soft",
                )}
              >
                <span className="block break-words">{item.name}</span>
                {item.sku ? (
                  <span className="block text-caption text-text-muted">
                    {item.sku}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p
            role="status"
            className="border-t border-border bg-surface-muted/50 px-3 py-2 text-caption text-text-muted"
          >
            {status}
          </p>
        </div>
      ) : null}
    </div>
  );
}

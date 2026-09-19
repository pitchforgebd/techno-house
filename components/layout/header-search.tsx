"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { IconSearch } from "@/components/layout/chrome-icons";
import type { ProductSearchSuggestion } from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/search/query";
import { cn } from "@/lib/cn";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

type SuggestState = {
  query: string;
  items: ProductSearchSuggestion[];
  total: number;
  loading: boolean;
};

const EMPTY: SuggestState = { query: "", items: [], total: 0, loading: false };

export function HeaderSearchForm({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [state, setState] = useState<SuggestState>(EMPTY);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      requestId.current += 1;
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true }));
      fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { items: ProductSearchSuggestion[]; total: number } | null) => {
          if (id !== requestId.current) {
            return;
          }
          setState({
            query,
            items: data?.items ?? [],
            total: data?.total ?? 0,
            loading: false,
          });
          setActiveIndex(-1);
        })
        .catch(() => {
          if (id === requestId.current) {
            setState((prev) => ({ ...prev, loading: false }));
          }
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const showDropdown =
    open && value.trim().length >= MIN_QUERY_LENGTH;

  function closeDropdown() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function goToProduct(slug: string) {
    closeDropdown();
    router.push(`/product/${slug}`);
  }

  return (
    <div
      ref={containerRef}
      className="relative min-w-0"
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          containerRef.current?.contains(event.relatedTarget as Node)
        ) {
          return;
        }
        closeDropdown();
      }}
    >
      <form
        action="/search"
        method="get"
        role="search"
        autoComplete="off"
        className={cn(
          "flex min-w-0 overflow-hidden rounded-sm bg-surface",
          "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
          className,
        )}
      >
        <label htmlFor={id} className="sr-only">
          Search products
        </label>
        <input
          id={id}
          name="q"
          type="search"
          placeholder="Enter your keyword..."
          maxLength={SEARCH_QUERY_MAX_LENGTH}
          autoComplete="off"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!showDropdown || state.items.length === 0) {
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % state.items.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex(
                (index) =>
                  (index - 1 + state.items.length) % state.items.length,
              );
            } else if (event.key === "Enter" && activeIndex >= 0) {
              const active = state.items[activeIndex];
              if (active) {
                event.preventDefault();
                goToProduct(active.slug);
              }
            } else if (event.key === "Escape") {
              closeDropdown();
            }
          }}
          className="min-h-10 w-full min-w-0 bg-transparent px-3 text-body text-text placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 shrink-0 items-center justify-center bg-primary px-4 text-primary-foreground transition-colors hover:bg-primary-hover"
          aria-label="Search"
        >
          <IconSearch />
        </button>
      </form>

      {showDropdown ? (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-[26rem] overflow-y-auto rounded-md border border-border bg-surface shadow-lg"
        >
          {state.loading && state.items.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-caption text-text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Searching…
            </div>
          ) : state.items.length === 0 ? (
            <p className="px-4 py-4 text-caption text-text-muted">
              No products found for “{state.query}”.
            </p>
          ) : (
            <>
              <ul>
                {state.items.map((item, index) => (
                  <li key={item.slug}>
                    <Link
                      href={`/product/${item.slug}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={closeDropdown}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors",
                        index === activeIndex
                          ? "bg-surface-muted"
                          : "hover:bg-surface-muted",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- small dropdown thumbnail, no next/image overhead needed */}
                      <img
                        src={item.image.src}
                        alt=""
                        className="size-12 shrink-0 rounded-sm border border-border object-contain bg-white"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-label text-text">
                          {item.name}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-baseline gap-2">
                          <span className="text-label font-semibold text-primary">
                            {formatMoney(item.price)}
                          </span>
                          {item.compareAtPrice ? (
                            <span className="text-caption text-text-muted line-through">
                              {formatMoney(item.compareAtPrice)}
                            </span>
                          ) : null}
                          {item.stockStatus === "out_of_stock" ? (
                            <span className="text-caption font-medium text-danger">
                              Out of stock
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {state.total > state.items.length ? (
                <Link
                  href={`/search?q=${encodeURIComponent(state.query)}`}
                  onClick={closeDropdown}
                  className="block border-t border-border px-3 py-2.5 text-center text-label font-medium text-primary hover:bg-surface-muted"
                >
                  See all {state.total} results for “{state.query}”
                </Link>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

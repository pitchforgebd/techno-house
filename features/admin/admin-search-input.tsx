"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 350;

/**
 * Debounced admin list search — auto-navigates to `buildHref(value)` ~350ms
 * after the operator stops typing, so no Enter press is required. Enter (or
 * the native search-field Enter) still submits immediately, for anyone who
 * prefers it.
 */
export function AdminSearchInput({
  defaultValue,
  buildHref,
  placeholder,
  "aria-label": ariaLabel,
  name = "q",
  formClassName,
  className,
}: {
  defaultValue: string;
  buildHref: (value: string) => string;
  placeholder?: string;
  "aria-label"?: string;
  name?: string;
  formClassName?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  // Resets `value` when the URL's own `q` changes under us (e.g. Back/
  // Forward, or a filter elsewhere on the page resetting the query) — the
  // React-recommended "adjust state during render" pattern, not an effect,
  // so it can't trigger the cascading-render lint violation an
  // effect-based sync here would.
  const [syncedDefault, setSyncedDefault] = useState(defaultValue);
  if (defaultValue !== syncedDefault) {
    setSyncedDefault(defaultValue);
    setValue(defaultValue);
  }
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function queue(next: string) {
    setValue(next);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      router.push(buildHref(next));
    }, DEBOUNCE_MS);
  }

  return (
    <form
      role="search"
      className={cn("relative min-w-0", formClassName)}
      onSubmit={(event) => {
        event.preventDefault();
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        router.push(buildHref(value));
      }}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
        aria-hidden
      />
      <Input
        name={name}
        type="search"
        value={value}
        onChange={(event) => queue(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("pl-9", className)}
      />
    </form>
  );
}

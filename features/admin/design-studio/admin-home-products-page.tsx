"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Search, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  StudioBackLink,
  StudioCard,
  controlClass,
} from "@/features/admin/design-studio/studio-ui";
import {
  saveHomeSectionAction,
  searchHomeSectionProductsAction,
} from "@/features/admin/design-studio/home-section-actions";
import { formatMoney } from "@/lib/format/currency";
import {
  HOME_SECTION_MAX,
  moveInList,
  type HomeSectionId,
} from "@/lib/marketing/home-section-input";
import type { HomeSectionItem } from "@/lib/marketing/home-sections";

function StatusBadges({ item }: { item: HomeSectionItem }) {
  return (
    <>
      {!item.isActive ? (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
          Unpublished — hidden on the homepage
        </span>
      ) : null}
      {item.stockStatus === "out_of_stock" ? (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
          Out of stock
        </span>
      ) : null}
    </>
  );
}

function ProductThumb({ item }: { item: HomeSectionItem }) {
  return item.imageSrc ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin preview only
    <img
      src={item.imageSrc}
      alt=""
      className="size-12 shrink-0 rounded-md border border-neutral-100 object-cover"
    />
  ) : (
    <span className="size-12 shrink-0 rounded-md border border-neutral-100 bg-neutral-50" />
  );
}

function SectionEditor({
  section,
  title,
  hint,
  emptyNote,
  initial,
}: {
  section: HomeSectionId;
  title: string;
  hint: string;
  emptyNote: string;
  initial: HomeSectionItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  // The last search answer, tagged with the text it answers, so "searching" and
  // the visible results are derived while rendering (no setState in the effect).
  const [found, setFound] = useState<{
    query: string;
    items: HomeSectionItem[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const full = items.length >= HOME_SECTION_MAX;
  const chosen = new Set(items.map((item) => item.id));
  const dirty =
    items.map((item) => item.id).join("|") !==
    initial.map((item) => item.id).join("|");

  const text = query.trim();
  const canSearch = text.length >= 2;
  const results = canSearch && found?.query === text ? found.items : [];
  const searching = canSearch && found?.query !== text;

  useEffect(() => {
    if (text.length < 2) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const items = await searchHomeSectionProductsAction(text);
      if (!cancelled) {
        setFound({ query: text, items });
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [text]);

  function add(item: HomeSectionItem) {
    if (full || chosen.has(item.id)) {
      return;
    }
    setItems((current) => [...current, item]);
  }

  function save() {
    if (pending) {
      return;
    }
    startTransition(async () => {
      const result = await saveHomeSectionAction({
        section,
        productIds: items.map((item) => item.id),
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        result.count === 0
          ? `${title} cleared — the homepage now shows the automatic list`
          : `${title} saved — ${result.count} ${result.count === 1 ? "product is" : "products are"} live on the homepage`,
      );
      router.refresh();
    });
  }

  return (
    <StudioCard
      title={title}
      hint={hint}
      onUpdate={save}
      updateLabel={pending ? "Saving…" : "Save section"}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium text-neutral-800">
          {items.length} / {HOME_SECTION_MAX} products
        </p>
        {dirty ? (
          <p className="text-xs font-medium text-amber-700">
            Unsaved changes — press “Save section” to publish them.
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-5 text-sm text-neutral-500">
          {emptyNote}
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2.5"
            >
              <span className="w-5 shrink-0 text-center text-xs font-semibold text-neutral-400">
                {index + 1}
              </span>
              <ProductThumb item={item} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {item.name}
                </p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                  <span className="truncate">{item.sku}</span>
                  <span>·</span>
                  <span>{formatMoney({ amount: item.priceAmount })}</span>
                  <StatusBadges item={item} />
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move ${item.name} up`}
                  disabled={index === 0}
                  onClick={() => setItems((c) => moveInList(c, index, "up"))}
                  className="rounded-md border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.name} down`}
                  disabled={index === items.length - 1}
                  onClick={() => setItems((c) => moveInList(c, index, "down"))}
                  className="rounded-md border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() =>
                    setItems((c) => c.filter((other) => other.id !== item.id))
                  }
                  className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="space-y-2 border-t border-neutral-100 pt-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-800">
            Add a product
          </span>
          <span className="relative block">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              value={query}
              disabled={full}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                full
                  ? `This section is full (${HOME_SECTION_MAX}). Remove one to add another.`
                  : "Search by name or SKU (at least 2 letters)…"
              }
              className={`${controlClass} pl-9`}
            />
          </span>
        </label>
        {searching ? (
          <p className="text-xs text-neutral-400">Searching…</p>
        ) : null}
        {!full && !searching && query.trim().length >= 2 && results.length === 0 ? (
          <p className="text-xs text-neutral-500">
            No published product matches “{query.trim()}”.
          </p>
        ) : null}
        {results.length > 0 && !full ? (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto rounded-lg border border-neutral-200 p-2">
            {results.map((item) => {
              const added = chosen.has(item.id);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-md p-1.5 hover:bg-neutral-50"
                >
                  <ProductThumb item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-900">
                      {item.name}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                      <span className="truncate">{item.sku}</span>
                      <span>·</span>
                      <span>{formatMoney({ amount: item.priceAmount })}</span>
                      <StatusBadges item={item} />
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => add(item)}
                    className="shrink-0 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
                  >
                    {added ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </StudioCard>
  );
}

export function AdminHomeProductsPage({
  featured,
  deals,
}: {
  featured: HomeSectionItem[];
  deals: HomeSectionItem[];
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Homepage products
        </h1>
        <p className="mt-1 max-w-prose text-sm text-neutral-500">
          Choose exactly which products appear in the two homepage sections, in
          the order you want. These lists are separate from the “Today&apos;s
          deal” switch, which still decides what the Deals page shows — so the
          Deals page can hold many products while the homepage shows your
          chosen {HOME_SECTION_MAX}. Changes go live as soon as you press Save.
        </p>
        <div className="mt-1">
          <StudioBackLink />
        </div>
      </div>

      {/* Remount on the saved ids so a refresh after Save resets the editor. */}
      <SectionEditor
        key={`featured:${featured.map((item) => item.id).join("|")}`}
        section="featured"
        title="Featured"
        hint="The “Featured” section on the homepage."
        emptyNote={`Nothing chosen yet, so the homepage shows an automatic list (the first ${HOME_SECTION_MAX} products of the catalogue). Add products below to choose them yourself.`}
        initial={featured}
      />
      <SectionEditor
        key={`deals:${deals.map((item) => item.id).join("|")}`}
        section="deals"
        title="Best deals"
        hint="The “Best deals” section on the homepage."
        emptyNote={`Nothing chosen yet, so the homepage shows an automatic list (the ${HOME_SECTION_MAX} deepest discounts among products with the Today's deal switch on). Add products below to choose them yourself.`}
        initial={deals}
      />
    </div>
  );
}

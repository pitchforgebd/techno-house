"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadBuildProducts } from "@/features/pc-builder/actions";
import { useBuilderStore } from "@/features/pc-builder/use-builder-store";
import type { ProductSummary } from "@/lib/data";
import {
  BUILDER_SLOTS,
  countFilledSlots,
  summarizeBuildPricing,
  type BuildSelection,
} from "@/lib/domain/pc-builder";
import { formatMoney } from "@/lib/format/currency";

export function PcBuilderShareView({
  selection,
  valid,
}: {
  selection: BuildSelection;
  valid: boolean;
}) {
  const router = useRouter();
  const { loadSelection } = useBuilderStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();
  const filled = countFilledSlots(selection).filled;

  useEffect(() => {
    if (!valid || filled === 0) {
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      const items = await loadBuildProducts(selection);
      if (!cancelled) {
        setProducts(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selection, valid, filled]);

  const productsBySlug = useMemo(() => {
    const map = new Map<string, ProductSummary>();
    if (!valid || filled === 0) {
      return map;
    }
    for (const product of products) {
      map.set(product.slug, product);
    }
    return map;
  }, [products, valid, filled]);

  const pricing = useMemo(() => {
    return summarizeBuildPricing(
      BUILDER_SLOTS.filter((slot) => {
        const slug = selection[slot.id];
        return typeof slug === "string" && slug.length > 0;
      }).map((slot) => {
        const slug = selection[slot.id] as string;
        const product = productsBySlug.get(slug);
        return {
          priceAmount: product ? product.price.amount : null,
          stockStatus: product ? product.stockStatus : null,
        };
      }),
    );
  }, [selection, productsBySlug]);

  if (!valid || filled === 0) {
    return (
      <div className="mx-auto max-w-content px-4 py-8">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/pc-builder", label: "PC Builder" },
            { label: "Shared build" },
          ]}
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Shared build
        </h1>
        <EmptyState
          className="mt-6"
          title="Invalid or empty share link"
          description="This mock share id could not be decoded, or it has no parts. Ask for a new link from PC Builder."
          action={
            <Link
              href="/pc-builder"
              className={buttonClassName({ size: "sm" })}
            >
              Open PC Builder
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/pc-builder", label: "PC Builder" },
          { label: "Shared build" },
        ]}
      />
      <header className="mt-4 max-w-prose">
        <h1 className="text-3xl font-semibold tracking-tight">Shared build</h1>
        <p className="mt-2 text-body text-text-muted">
          Read-only mock share. Product slugs only — no customer data. Open in
          the builder to edit on this device.
        </p>
      </header>

      <Alert tone="info" title="Mock share" className="mt-6">
        <p className="text-caption">
          Server-backed share tokens and privacy controls arrive in Phase 14.
        </p>
      </Alert>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section
          className="rounded-md border border-border bg-surface"
          aria-labelledby="shared-parts-heading"
        >
          <div className="border-b border-border px-4 py-3">
            <h2
              id="shared-parts-heading"
              className="text-label font-semibold text-text"
            >
              Parts in this share
            </h2>
            <p className="mt-1 text-caption text-text-muted">
              {filled} part{filled === 1 ? "" : "s"}
              {pending ? " · loading…" : ""}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {BUILDER_SLOTS.map((slot) => {
              const slug = selection[slot.id];
              if (typeof slug !== "string" || !slug) {
                return null;
              }
              const product = productsBySlug.get(slug);
              return (
                <li key={slot.id} className="px-4 py-3">
                  <p className="text-caption text-text-muted">{slot.label}</p>
                  {product ? (
                    <p className="text-label font-medium text-text">
                      <Link
                        href={`/product/${product.slug}`}
                        className="hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      <span className="ml-2 tabular-nums text-text-muted">
                        {formatMoney(product.price)}
                      </span>
                    </p>
                  ) : (
                    <p className="font-mono text-caption text-text-muted">
                      {slug}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="h-fit space-y-3 rounded-md border border-border bg-surface p-4">
          <p className="text-label font-semibold text-text">Display total</p>
          <p className="tabular-nums text-xl font-semibold text-text">
            {formatMoney({ amount: pricing.subtotal })}
          </p>
          <button
            type="button"
            className={buttonClassName({ className: "w-full" })}
            onClick={() => {
              loadSelection(selection);
              router.push("/pc-builder");
            }}
          >
            Open in PC Builder
          </button>
          <Link
            href="/pc-builder"
            className={buttonClassName({
              variant: "ghost",
              className: "w-full border border-border",
            })}
          >
            Back to builder
          </Link>
        </aside>
      </div>
    </div>
  );
}

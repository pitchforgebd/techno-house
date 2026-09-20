"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { useBuilderStore } from "@/features/pc-builder/use-builder-store";
import type { ProductSummary } from "@/lib/data";
import {
  BUILDER_SLOTS,
  countFilledSlots,
  type BuildPricingSummary,
  type BuildSelection,
  type BuildValidationIssue,
} from "@/lib/domain/pc-builder";
import { formatMoney } from "@/lib/format/currency";

const shareActionClassName =
  "flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-3 text-center transition-colors hover:border-primary/40 hover:bg-surface-muted";
const shareActionLabelClassName = "text-caption font-semibold text-primary";

function BuildShareActions({ id, buildName }: { id: string; buildName: string }) {
  async function handleShare() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (!url) {
      return;
    }
    // Native share sheet on mobile/supporting browsers; clipboard copy is
    // the fallback everywhere else (and when the user cancels the sheet,
    // most browsers reject the promise rather than resolving — swallow that
    // silently rather than treating "I changed my mind" as a copy failure).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: buildName, url });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess("Link copied");
    } catch {
      notifyError({ title: "Could not copy the link" });
    }
  }

  return (
    <div className="print:hidden grid grid-cols-3 gap-2">
      <a href={`/pc-builder/share/${id}/pdf`} download className={shareActionClassName}>
        <Download aria-hidden className="size-5 text-text" strokeWidth={1.75} />
        <span className={shareActionLabelClassName}>Download</span>
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className={shareActionClassName}
      >
        <Printer aria-hidden className="size-5 text-text" strokeWidth={1.75} />
        <span className={shareActionLabelClassName}>Print</span>
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className={shareActionClassName}
      >
        <Share2 aria-hidden className="size-5 text-text" strokeWidth={1.75} />
        <span className={shareActionLabelClassName}>Share</span>
      </button>
    </div>
  );
}

export function PcBuilderShareView({
  id,
  name,
  selection,
  valid,
  products,
  pricing,
  issues,
}: {
  id: string;
  name?: string | null;
  selection: BuildSelection;
  valid: boolean;
  products: ProductSummary[];
  pricing: BuildPricingSummary;
  issues: BuildValidationIssue[];
}) {
  const router = useRouter();
  const { loadSelection } = useBuilderStore();
  const filled = countFilledSlots(selection).filled;
  const buildName = name?.trim() || "Shared build";

  const productsBySlug = useMemo(() => {
    const map = new Map<string, ProductSummary>();
    for (const product of products) {
      map.set(product.slug, product);
    }
    return map;
  }, [products]);

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
          description="This share link could not be found, or it has no parts. Ask for a new link from PC Builder."
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
        <h1 className="text-3xl font-semibold tracking-tight">{buildName}</h1>
        <p className="mt-2 text-body text-text-muted">
          Read-only share. Parts only — no account or personal data. Prices come
          from the server. Open in the builder to edit on this device.
        </p>
      </header>

      <Alert tone="info" title="Public parts list" className="mt-6">
        <p className="text-caption">
          This page shows the selected parts only. It does not include the
          owner’s account.
        </p>
      </Alert>

      {issues.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {issues.map((issue) => (
            <li key={`${issue.code}-${issue.slotId}`}>
              <Alert tone="warning" title="Build check">
                <p className="text-caption">{issue.message}</p>
              </Alert>
            </li>
          ))}
        </ul>
      ) : null}

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
          <p className="text-label font-semibold text-text">Checked total</p>
          <p className="tabular-nums text-xl font-semibold text-text">
            {formatMoney({ amount: pricing.subtotal })}
          </p>
          {pricing.missingPriceCount > 0 ? (
            <p className="text-caption text-text-muted">
              {pricing.missingPriceCount} part
              {pricing.missingPriceCount === 1 ? "" : "s"} could not be priced.
            </p>
          ) : null}

          <BuildShareActions id={id} buildName={buildName} />

          <button
            type="button"
            className={buttonClassName({ className: "w-full print:hidden" })}
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
              className: "w-full border border-border print:hidden",
            })}
          >
            Back to builder
          </Link>
        </aside>
      </div>
    </div>
  );
}

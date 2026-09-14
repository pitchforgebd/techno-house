"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Copy, ExternalLink, Frown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { AdminPcBuilderSubnav } from "@/features/admin/pc-builder/admin-pc-builder-subnav";
import { setPcBuildFeaturedAction } from "@/features/admin/pc-builder/build-actions";
import { InstructionCard, controlClass } from "@/features/admin/settings/setup-ui";
import { cn } from "@/lib/cn";

/** Mirrors AdminPcBuilderBuild in lib/pc-builder/admin-builds.ts (server-only, not importable from a client component). */
type AdminPcBuilderBuildProp = {
  id: string;
  name: string;
  ownerLabel: string;
  componentsCount: number;
  shareLink: string;
  featured: boolean;
  status: "draft" | "saved" | "shared";
  updatedAt: string;
};

export function AdminPcBuilderBuilds({
  builds: initialBuilds,
}: {
  builds: AdminPcBuilderBuildProp[];
}) {
  const [builds, setBuilds] = useState(initialBuilds);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return builds;
    return builds.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.ownerLabel.toLowerCase().includes(q),
    );
  }, [builds, query]);

  function toggleFeatured(id: string, next: boolean) {
    setPendingId(id);
    setBuilds((current) =>
      current.map((build) => (build.id === id ? { ...build, featured: next } : build)),
    );
    startTransition(async () => {
      const result = await setPcBuildFeaturedAction({ id, featured: next });
      setPendingId(null);
      if (!result.ok) {
        notifyError(result.formError);
        setBuilds((current) =>
          current.map((build) => (build.id === id ? { ...build, featured: !next } : build)),
        );
        return;
      }
      notifySuccess(next ? "Marked as featured" : "Removed from featured");
    });
  }

  function copyLink(link: string) {
    if (!link) {
      notifyError("This build hasn't been shared yet — no link to copy.");
      return;
    }
    void navigator.clipboard?.writeText(link);
    notifySuccess("Share link copied");
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-4">
          <AdminPcBuilderSubnav />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Saved builds
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Real customer and guest builds saved from the storefront PC
              Builder.
            </p>
          </div>
        </div>
        <Link
          href="/pc-builder"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6c5ce7] hover:underline"
        >
          View storefront builder
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <form
            className="relative max-w-md"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search builds..."
              className={cn(controlClass, "pl-9")}
            />
          </form>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-neutral-400">
            <Frown className="size-12 opacity-50" aria-hidden />
            <p className="text-sm">
              {builds.length === 0
                ? "No customer builds saved yet."
                : "Nothing found"}
            </p>
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[56rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="w-12 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    #
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Build name
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Owner
                  </TableHeader>
                  <TableHeader className="w-28 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Components
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Share link
                  </TableHeader>
                  <TableHeader className="w-24 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Featured
                  </TableHeader>
                  <TableHeader className="w-20 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-neutral-100"
                  >
                    <TableCell className="tabular-nums text-neutral-500">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-neutral-900">{item.name}</p>
                      <p className="text-xs capitalize text-neutral-500">
                        {item.status} · {item.updatedAt}
                      </p>
                    </TableCell>
                    <TableCell className="text-neutral-700">
                      {item.ownerLabel}
                    </TableCell>
                    <TableCell className="tabular-nums text-neutral-800">
                      {item.componentsCount}
                    </TableCell>
                    <TableCell>
                      {item.shareLink ? (
                        <button
                          type="button"
                          onClick={() => copyLink(item.shareLink)}
                          className="inline-flex max-w-[14rem] items-center gap-1 truncate text-xs text-[#3897f0] hover:underline"
                        >
                          <Copy className="size-3 shrink-0" aria-hidden />
                          {item.shareLink.replace(/^https?:\/\//, "")}
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-400">Not shared</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AdminToggleSwitch
                        label={`Feature ${item.name}`}
                        checked={item.featured}
                        disabled={pendingId === item.id}
                        onChange={(next) => toggleFeatured(item.id, next)}
                        activeClassName="bg-[#6c5ce7]"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        aria-label={`Copy share link for ${item.name}`}
                        disabled={!item.shareLink}
                        onClick={() => copyLink(item.shareLink)}
                        className="inline-flex size-8 items-center justify-center rounded-full bg-sky-100 text-[#3897f0] hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Copy className="size-3.5" aria-hidden />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <InstructionCard>
        <p>
          {builds.filter((b) => b.featured).length} build
          {builds.filter((b) => b.featured).length === 1 ? "" : "s"} currently
          marked as featured — each toggle saves immediately.
        </p>
        <p>
          Share URLs mirror storefront{" "}
          <span className="font-medium">/pc-builder/share/[slug]</span>{" "}
          routes. Guest builds (not signed in) are stored on-device only and
          can&apos;t appear here until the customer signs in and saves.
        </p>
      </InstructionCard>
    </div>
  );
}

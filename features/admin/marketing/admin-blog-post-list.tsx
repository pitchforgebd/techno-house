"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BlogPost } from "@/lib/admin/engagement-mock";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminBlogPostList({ posts }: { posts: BlogPost[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      return posts;
    }
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(needle) ||
        post.category.toLowerCase().includes(needle) ||
        post.slug.toLowerCase().includes(needle),
    );
  }, [posts, q]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            All blog posts
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Editorial content for guides and buying advice
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/blog/categories"
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "border border-neutral-200",
            })}
          >
            Categories
          </Link>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#3897f0] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f86d8]"
          >
            <Plus className="size-4" aria-hidden />
            New post
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search posts..."
              className={cn(controlClass, "pl-9")}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No posts match"
              description="Try another search."
            />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[52rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Title
                  </TableHeader>
                  <TableHeader className="w-36 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Category
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Status
                  </TableHeader>
                  <TableHeader className="w-40 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Author
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Published
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((post) => (
                  <TableRow
                    key={post.id}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="font-medium text-neutral-900 hover:text-[#3897f0]"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-neutral-500">
                        /{post.slug}
                      </p>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {post.category}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded px-2 py-0.5 text-[0.7rem] font-semibold capitalize",
                          post.status === "published"
                            ? "bg-emerald-100 text-emerald-700"
                            : post.status === "scheduled"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-neutral-100 text-neutral-600",
                        )}
                      >
                        {post.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {post.author}
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {post.publishedAt ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

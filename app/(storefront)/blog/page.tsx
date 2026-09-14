import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { listPublicPosts } from "@/lib/content/blog";
import { publicOrigin } from "@/lib/seo/public-origin";

export const metadata: Metadata = {
  title: "Blog — Techno House",
  description: "Guides and buying notes from Techno House.",
  alternates: { canonical: `${publicOrigin()}/blog` },
};

export default async function BlogIndexPage() {
  const posts = await listPublicPosts();

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-2 text-body text-text-muted">
        Published guides and buying notes. Drafts stay in admin until they are
        published.
      </p>
      {posts.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Blog"
          description="Published posts will appear here."
        />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="overflow-hidden rounded-md border border-border bg-surface"
            >
              {post.coverImagePath ? (
                <Link href={`/blog/${post.slug}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImagePath}
                    alt={post.coverImageAlt || post.title}
                    className="h-40 w-full object-cover"
                  />
                </Link>
              ) : null}
              <div className="p-4">
                {post.category ? (
                  <p className="text-caption font-medium text-primary">
                    {post.category}
                  </p>
                ) : null}
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
                  <Link href={`/blog/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt ? (
                  <p className="mt-2 text-body text-text-muted">{post.excerpt}</p>
                ) : null}
                {post.publishedAt ? (
                  <p className="mt-3 text-caption text-text-muted">
                    {post.publishedAt}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

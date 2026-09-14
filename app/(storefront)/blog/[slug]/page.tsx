import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPost } from "@/lib/content/blog";
import { looksLikeHtml, sanitizeBlogBody } from "@/lib/content/sanitize-html";
import { publicOrigin } from "@/lib/seo/public-origin";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPost(slug);
  if (!post) {
    return { title: "Post not found" };
  }
  const title = post.seoTitle || `${post.title} — Techno House`;
  const description = post.seoDescription || post.excerpt || undefined;
  const url = `${publicOrigin()}/blog/${post.slug}`;
  const imageUrl = post.coverImagePath
    ? `${publicOrigin()}${post.coverImagePath}`
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url,
      publishedTime: post.publishedAt ?? undefined,
      images: imageUrl
        ? [{ url: imageUrl, alt: post.coverImageAlt || post.title }]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublicPost(slug);
  if (!post) {
    notFound();
  }

  const url = `${publicOrigin()}/blog/${post.slug}`;
  const imageUrl = post.coverImagePath ? `${publicOrigin()}${post.coverImagePath}` : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.publishedAt ?? undefined,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Techno House" },
    publisher: { "@type": "Organization", name: "Techno House" },
  };

  return (
    <article className="mx-auto max-w-content px-4 py-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="text-caption font-medium text-primary">
        <Link href="/blog" className="hover:underline">
          Blog
        </Link>
        {post.category ? (
          <>
            <span className="text-text-muted"> / </span>
            <span>{post.category}</span>
          </>
        ) : null}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {post.title}
      </h1>
      {post.publishedAt ? (
        <p className="mt-2 text-caption text-text-muted">{post.publishedAt}</p>
      ) : null}
      {post.coverImagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImagePath}
          alt={post.coverImageAlt || post.title}
          className="mt-4 w-full rounded-lg object-cover"
        />
      ) : null}
      {post.excerpt ? (
        <p className="mt-4 text-body text-text-muted">{post.excerpt}</p>
      ) : null}
      {looksLikeHtml(post.body) ? (
        <div
          className="th-rich-text mt-6 text-body text-text"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: sanitizeBlogBody(post.body) }}
        />
      ) : (
        <div className="mt-6 space-y-4 text-body text-text">
          {post.body.split(/\n\n+/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}
    </article>
  );
}

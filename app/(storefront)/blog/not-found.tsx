import Link from "next/link";

export default function BlogNotFound() {
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Post not found</h1>
      <p className="mt-2 text-body text-text-muted">
        That article is not published or does not exist.
      </p>
      <p className="mt-4">
        <Link href="/blog" className="text-primary hover:underline">
          Back to the blog
        </Link>
      </p>
    </div>
  );
}

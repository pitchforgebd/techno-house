"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { RichTextEditor } from "@/features/admin/marketing/rich-text-editor";
import {
  Field,
  Input,
  StudioBackLink,
  Textarea,
  controlClass,
} from "@/features/admin/design-studio/studio-ui";
import { saveContentPageAction } from "@/features/admin/design-studio/content-page-actions";

/** Mirrors AdminContentPage in lib/content/pages.ts (server-only, not importable from a client component). */
type AdminContentPageProp = {
  slug: string;
  title: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  updatedAt: string | null;
};

const PAGE_URL: Record<string, string> = {
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  support: "/support",
  warranty: "/warranty",
  shipping: "/shipping",
  returns: "/returns",
  terms: "/terms",
};

export function AdminStudioPagesList({
  pages,
}: {
  pages: AdminContentPageProp[];
}) {
  return (
    <div className="mx-auto max-w-[1100px] space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          All Pages
        </h1>
        <StudioBackLink />
        <p className="mt-2 max-w-prose text-sm text-neutral-500">
          These 8 pages already exist on the storefront — editing here changes
          their real, live content. Creating brand-new pages isn&apos;t
          supported yet (it needs its own storefront route).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              <th className="w-12 px-4 py-3">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Status</th>
              <th className="w-20 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page, index) => (
              <tr key={page.slug} className="border-b border-neutral-100">
                <td className="px-4 py-3 tabular-nums text-neutral-500">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {page.title}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {PAGE_URL[page.slug] ?? `/${page.slug}`}
                </td>
                <td className="px-4 py-3">
                  {page.body.trim() ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                      Placeholder
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/design-studio/pages/${page.slug}`}
                    aria-label={`Edit ${page.title}`}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-sky-100 text-[#3897f0] hover:bg-sky-200"
                  >
                    <Pencil className="size-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminStudioPageForm({ page }: { page: AdminContentPageProp }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const [metaTitle, setMetaTitle] = useState(page.metaTitle);
  const [metaDesc, setMetaDesc] = useState(page.metaDescription);
  const [keywords, setKeywords] = useState(page.metaKeywords);

  function save() {
    startTransition(async () => {
      const result = await saveContentPageAction({
        slug: page.slug,
        title,
        body,
        metaTitle,
        metaDescription: metaDesc,
        metaKeywords: keywords,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(`${page.title} saved — live on the storefront`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Edit · {page.title}
        </h1>
        <Link
          href="/admin/design-studio/pages"
          className="text-sm font-medium text-[#3897f0] hover:underline"
        >
          ← Back to pages
        </Link>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold">Page Content</h2>
        </div>
        <div className="space-y-4 px-5 py-5">
          <Field label="Title" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className={controlClass}
            />
          </Field>
          <Field label="Link">
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              yourstore.com{PAGE_URL[page.slug] ?? `/${page.slug}`}
            </div>
          </Field>
          <Field label="Content" required>
            <RichTextEditor value={body} onChange={setBody} disabled={pending} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold">Seo Fields</h2>
        </div>
        <div className="space-y-4 px-5 py-5">
          <Field label="Meta Title">
            <Input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Title"
              className={controlClass}
            />
          </Field>
          <Field label="Meta description">
            <Textarea
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              placeholder="Description"
              rows={3}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Keywords" hint="Separate with comma">
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Keyword, Keyword"
              className={controlClass}
            />
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-[#3897f0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2f86d8] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save Page"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

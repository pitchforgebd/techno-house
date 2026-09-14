"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { saveAdminCategoryAction } from "@/features/admin/categories/category-actions";
import { saveAdminBrandAction } from "@/features/admin/brands/brand-actions";
import { slugifyProduct } from "@/lib/catalog/product-input";

/**
 * Quick-create for the product form's "+ New category" / "+ New brand"
 * links (Phase 4) — was `notifySuccess("New category (mock)")` with no
 * modal and no mutation at all. Calls the exact same real actions the
 * dedicated /admin/categories/new and /admin/brands/new pages use, with
 * sane defaults for the fields this quick form doesn't ask for.
 */

function QuickCreateModal({
  open,
  onClose,
  title,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onCreate: (
    name: string,
    slug: string,
  ) => Promise<{ ok: true; slug: string } | { ok: false; formError: string }>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setError(null);
  }

  function handleCreate() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name.");
      return;
    }
    startTransition(async () => {
      const result = await onCreate(trimmed, slugifyProduct(trimmed));
      if (!result.ok) {
        setError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess(`${title} created`);
      reset();
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={title}
    >
      <div className="space-y-3">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Name
          </span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreate();
              }
            }}
          />
        </label>
        <p className="text-caption text-text-muted">
          Other details (description, image, position) can be filled in
          later from the full editor.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={handleCreate}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function AdminQuickCreateCategoryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (category: { slug: string; name: string }) => void;
}) {
  return (
    <QuickCreateModal
      open={open}
      onClose={onClose}
      title="New category"
      onCreate={async (name, slug) => {
        const result = await saveAdminCategoryAction({
          fields: {
            name,
            slug,
            parentSlug: "",
            position: "0",
            description: "",
            filterKeywords: "",
            filterAttr: "",
            isActive: true,
          },
        });
        if (result.ok) {
          onCreated({ slug: result.slug, name });
        }
        return result;
      }}
    />
  );
}

export function AdminQuickCreateBrandModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (brand: { slug: string; name: string }) => void;
}) {
  return (
    <QuickCreateModal
      open={open}
      onClose={onClose}
      title="New brand"
      onCreate={async (name, slug) => {
        const result = await saveAdminBrandAction({
          fields: {
            name,
            slug,
            position: "0",
            description: "",
            isActive: true,
          },
        });
        if (result.ok) {
          onCreated({ slug: result.slug, name });
        }
        return result;
      }}
    />
  );
}

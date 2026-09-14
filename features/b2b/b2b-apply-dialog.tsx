"use client";

import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { applyForB2BAction } from "@/features/b2b/b2b-apply-actions";

export function B2BApplyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await applyForB2BAction(formData);
      if (!result.ok) {
        setError(result.formError ?? "Could not submit your application.");
        return;
      }
      notifySuccess({
        title: "Application submitted",
        description: "We'll review your documents and email you once approved.",
      });
      formRef.current?.reset();
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Apply for wholesale pricing">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <p className="text-caption text-text-muted">
          Submit your business details. Our team reviews applications and
          approves them with a wholesale discount.
        </p>

        {error ? (
          <Alert tone="danger" title="Cannot submit">
            <p className="text-caption">{error}</p>
          </Alert>
        ) : null}

        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Company / shop name
          </span>
          <Input name="company" required disabled={pending} />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Contact name
          </span>
          <Input name="contactName" required disabled={pending} />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Shop address
          </span>
          <Input name="shopAddress" required disabled={pending} />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Trade licence (JPG, PNG, or PDF)
          </span>
          <input
            type="file"
            name="tradeLicence"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            required
            disabled={pending}
            className="block w-full text-caption text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-caption file:font-medium"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            NID (JPG, PNG, or PDF)
          </span>
          <input
            type="file"
            name="nid"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            required
            disabled={pending}
            className="block w-full text-caption text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-caption file:font-medium"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

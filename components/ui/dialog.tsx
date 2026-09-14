"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    if (open && !node.open) {
      node.showModal();
    }
    if (!open && node.open) {
      node.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn(
        "th-dialog w-full max-w-md rounded-lg border border-border bg-surface p-4 shadow-md",
        "text-text",
      )}
      onClose={onClose}
      aria-labelledby="th-dialog-title"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 id="th-dialog-title" className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      {children}
    </dialog>
  );
}

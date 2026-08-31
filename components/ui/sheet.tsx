"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  title,
  children,
  side = "right",
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  closeLabel?: string;
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
        "th-sheet mt-0 mb-0 h-full max-h-full w-[min(100%,22rem)] max-w-md",
        "rounded-none border-0 bg-surface p-0 shadow-md text-text",
        side === "right" &&
          "th-sheet-right mr-0 ml-auto border-l border-border",
        side === "left" && "th-sheet-left ml-0 mr-auto border-r border-border",
      )}
      onClose={onClose}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted/50 px-4 py-3">
          <h2 className="text-label font-semibold tracking-tight text-text">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-10 min-w-10 px-2"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">{closeLabel}</span>
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </dialog>
  );
}

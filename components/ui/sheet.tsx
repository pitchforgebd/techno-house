"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
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
        "th-sheet mt-0 mb-0 h-full max-h-full w-full max-w-md",
        "rounded-none border-0 bg-surface p-4 shadow-md text-text",
        side === "right" &&
          "th-sheet-right mr-0 ml-auto border-l border-border",
        side === "left" && "th-sheet-left ml-0 mr-auto border-r border-border",
      )}
      onClose={onClose}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      {children}
    </dialog>
  );
}

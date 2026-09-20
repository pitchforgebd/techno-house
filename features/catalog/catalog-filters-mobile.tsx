"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

export function CatalogFiltersMobile({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="border border-border"
        onClick={() => setOpen(true)}
      >
        Filters
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        side="left"
      >
        <div className="overflow-y-auto pb-4">{children}</div>
        {/* Filters apply as they are ticked, so this only dismisses the
            drawer — the results behind it are already up to date. */}
        <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-border bg-surface px-4 py-3">
          <Button
            type="button"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Show results
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

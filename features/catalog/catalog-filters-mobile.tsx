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
        <div className="overflow-y-auto pb-8">{children}</div>
      </Sheet>
    </div>
  );
}

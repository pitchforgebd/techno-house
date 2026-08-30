"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";

export function InteractiveDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        items={[
          {
            id: "specs",
            label: "Specifications",
            panel: <p>Grouped specification tables belong here.</p>,
          },
          {
            id: "details",
            label: "Details",
            panel: <p>Product details copy belongs here.</p>,
          },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Button variant="ghost" onClick={() => setSheetOpen(true)}>
          Open sheet
        </Button>
      </div>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Confirm action"
      >
        <p className="text-body text-text-muted">
          Native dialog with a focus trap and Escape to close.
        </p>
      </Dialog>
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
      >
        <p className="text-body text-text-muted">
          Side sheet for mobile filters and menus.
        </p>
      </Sheet>
    </div>
  );
}

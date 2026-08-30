"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { WishlistBody } from "@/features/lists/wishlist-body";

export function WishlistView() {
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { label: "Wishlist" },
        ]}
      />
      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Wishlist</h1>
        <p className="mt-2 text-body text-text-muted">
          Saved on this device only — not synced to an account yet.
        </p>
      </div>
      <WishlistBody className="mt-6" />
    </div>
  );
}

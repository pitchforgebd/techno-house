"use client";

import { AccountShell } from "@/features/account/account-shell";
import { WishlistBody } from "@/features/lists/wishlist-body";

export function AccountWishlistView() {
  return (
    <AccountShell title="Wishlist">
      <p className="text-caption text-text-muted">
        Same device-local list as the storefront wishlist. Not synced to a
        server account.
      </p>
      <WishlistBody className="mt-4" />
    </AccountShell>
  );
}

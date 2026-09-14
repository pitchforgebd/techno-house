"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CustomerSessionView } from "@/lib/auth/customer-session";

/**
 * Wholesale standing for the signed-in user, or null for a retail customer.
 *
 * A B2B buyer is the same `User` row with a `B2BAccount` attached — there is
 * one session type, which is why B2B credentials sign in through the customer
 * form and land in the customer panel. Rather than split authentication, the
 * account area branches on this: the panel keeps its structure and gains the
 * wholesale-only parts, and the header sends a B2B buyer to their own home.
 */
export type B2BSessionView = {
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  company: string;
};

const CustomerSessionContext = createContext<CustomerSessionView | null>(null);
const B2BSessionContext = createContext<B2BSessionView | null>(null);

/**
 * Hydrates the customer session from the server layout. After login/logout,
 * call `router.refresh()` so this value updates without a client-side store.
 */
export function CustomerSessionProvider({
  session,
  b2b = null,
  children,
}: {
  session: CustomerSessionView | null;
  b2b?: B2BSessionView | null;
  children: ReactNode;
}) {
  return (
    <CustomerSessionContext.Provider value={session}>
      <B2BSessionContext.Provider value={b2b}>
        {children}
      </B2BSessionContext.Provider>
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession(): CustomerSessionView | null {
  return useContext(CustomerSessionContext);
}

/** Null for retail customers and guests. */
export function useB2BSession(): B2BSessionView | null {
  return useContext(B2BSessionContext);
}

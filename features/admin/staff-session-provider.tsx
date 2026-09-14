"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StaffSessionView } from "@/lib/auth/staff-session";

type StaffSessionContextValue = {
  session: StaffSessionView | null;
  /** Configured obscure login path (`/admin/access/{slug}`). */
  loginPath: string;
};

const StaffSessionContext = createContext<StaffSessionContextValue>({
  session: null,
  loginPath: "/admin/access/th-ops-local",
});

/**
 * Hydrates staff session from the admin layout. After login/logout,
 * call `router.refresh()` so this value updates.
 */
export function StaffSessionProvider({
  session,
  loginPath,
  children,
}: {
  session: StaffSessionView | null;
  loginPath: string;
  children: ReactNode;
}) {
  return (
    <StaffSessionContext.Provider value={{ session, loginPath }}>
      {children}
    </StaffSessionContext.Provider>
  );
}

export function useStaffSession(): StaffSessionView | null {
  return useContext(StaffSessionContext).session;
}

export function useAdminLoginPath(): string {
  return useContext(StaffSessionContext).loginPath;
}

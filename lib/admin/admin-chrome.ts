/** Nexa-inspired admin chrome — scoped to /admin only. */

export const ADMIN_SIDEBAR_BG = "#2c1844";
export const ADMIN_MAIN_BG = "#f8f9fb";

export const ADMIN_DASHBOARD_TABS = [
  {
    href: "/admin",
    label: "Dashboard",
    match: (path: string) => path === "/admin",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    match: (path: string) =>
      path.startsWith("/admin/refunds") ||
      (path.startsWith("/admin/orders") &&
        !path.startsWith("/admin/orders/unpaid")),
  },
  {
    href: "/admin/orders/unpaid",
    label: "Unpaid",
    match: (path: string) => path.startsWith("/admin/orders/unpaid"),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    match: (path: string) =>
      path.startsWith("/admin/reports") || path.startsWith("/admin/analytics"),
  },
  {
    href: "/admin/design-studio",
    label: "Design",
    match: (path: string) => path.startsWith("/admin/design-studio"),
  },
] as const;

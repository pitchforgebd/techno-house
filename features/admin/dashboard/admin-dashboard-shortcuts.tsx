import Link from "next/link";
import {
  AlertTriangle,
  FileBarChart,
  PackagePlus,
  ShoppingBag,
  TicketPercent,
  UserPlus,
} from "lucide-react";
import { AdminCalculator } from "@/features/admin/dashboard/admin-calculator";

export type DashboardShortcut = {
  id: string;
  label: string;
  href: string;
  icon: "product" | "coupon" | "customer" | "orders" | "reports" | "lowStock";
  tone: "blue" | "pink" | "purple" | "orange" | "green" | "red";
};

const ICONS: Record<DashboardShortcut["icon"], React.ComponentType<{ className?: string }>> = {
  product: PackagePlus,
  coupon: TicketPercent,
  customer: UserPlus,
  orders: ShoppingBag,
  reports: FileBarChart,
  lowStock: AlertTriangle,
};

const TONES: Record<DashboardShortcut["tone"], string> = {
  blue: "bg-blue-100 text-blue-600",
  pink: "bg-pink-100 text-pink-600",
  purple: "bg-violet-100 text-violet-600",
  orange: "bg-orange-100 text-orange-600",
  green: "bg-emerald-100 text-emerald-600",
  red: "bg-red-100 text-red-600",
};

/**
 * Quick-action row: the handful of things a staff member opens the dashboard
 * to do next, plus the calculator. `shortcuts` is pre-filtered server-side by
 * `canAccessAdminPath` against the signed-in staff's own permissions — a
 * shortcut is never shown pointing at a page that would immediately bounce
 * the viewer to "Forbidden", the same way the admin nav already hides
 * sections a role cannot reach rather than greying them out.
 */
export function AdminDashboardShortcuts({
  shortcuts,
}: {
  shortcuts: DashboardShortcut[];
}) {
  if (shortcuts.length === 0) {
    // Every candidate route was permission-filtered away. The calculator
    // needs no permission (it touches no data), so it still renders alone.
    return (
      <div className="flex flex-wrap gap-3">
        <AdminCalculator />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      {shortcuts.map((shortcut) => {
        const Icon = ICONS[shortcut.icon];
        return (
          <Link
            key={shortcut.id}
            href={shortcut.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-black/5 bg-white px-4 py-3 text-center shadow-sm transition-colors hover:border-primary/30 hover:bg-primary-soft/40"
          >
            <span
              className={`flex size-9 items-center justify-center rounded-lg ${TONES[shortcut.tone]}`}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-caption font-medium text-text">
              {shortcut.label}
            </span>
          </Link>
        );
      })}
      <AdminCalculator />
    </div>
  );
}

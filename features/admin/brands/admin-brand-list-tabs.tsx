import Link from "next/link";
import { Plus } from "lucide-react";
import {
  BRAND_TAB_LABELS,
  adminBrandsHref,
  type AdminBrandListParams,
  type AdminBrandTab,
} from "@/lib/admin/brand-list-params";

const TABS: AdminBrandTab[] = ["all", "unused"];

export function AdminBrandListTabs({
  params,
  canAdd,
}: {
  params: AdminBrandListParams;
  canAdd: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
      <nav
        aria-label="Brand list views"
        className="flex flex-wrap items-center gap-x-6 gap-y-2"
      >
        {TABS.map((tab) => {
          const active = params.tab === tab;
          return (
            <Link
              key={tab}
              href={adminBrandsHref({ base: params, tab, page: 1 })}
              className={`-mb-px border-b-2 pb-3 text-body font-medium transition-colors ${
                active
                  ? "border-[#3897f0] text-[#3897f0]"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {BRAND_TAB_LABELS[tab]}
            </Link>
          );
        })}
      </nav>

      {canAdd ? (
        <div className="mb-2 flex items-center gap-2">
          <Link
            href="/admin/brands/new"
            className="text-body font-medium text-[#3897f0] hover:underline"
          >
            Add new brand
          </Link>
          <Link
            href="/admin/brands/new"
            aria-label="Add new brand"
            className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
          >
            <Plus className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="mb-2" />
      )}
    </div>
  );
}

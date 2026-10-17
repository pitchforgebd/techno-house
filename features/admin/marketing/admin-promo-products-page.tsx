"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AdminOfferAssignPanel } from "@/features/admin/marketing/admin-offer-assign-panel";
import { AdminPromoProductChannelList } from "@/features/admin/marketing/admin-promo-product-channel-list";
import type { PromoCatalogProduct } from "@/lib/admin/promotions-offers-mock";
import type { AssignablePromotionOption } from "@/lib/marketing/promotions";

type PersistResult = { ok: true } | { ok: false; formError: string };

type Tab = "promotional" | "offer";

export function AdminPromoProductsPage({
  assigned,
  catalog,
  categories,
  promotions,
  persist,
  assignToPromotion,
}: {
  assigned: PromoCatalogProduct[];
  catalog: PromoCatalogProduct[];
  categories: { slug: string; name: string }[];
  promotions: AssignablePromotionOption[];
  persist: {
    assign: (ids: string[]) => Promise<PersistResult>;
    remove: (id: string) => Promise<PersistResult>;
    bulkRemove: (ids: string[]) => Promise<PersistResult>;
    setFlag?: (id: string, on: boolean) => Promise<PersistResult>;
  };
  assignToPromotion: (
    promotionId: string,
    productIds: string[],
  ) => Promise<PersistResult>;
}) {
  const [tab, setTab] = useState<Tab>("promotional");

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pb-8">
      <nav aria-label="Promotional products views" className="flex gap-1">
        <TabButton active={tab === "promotional"} onClick={() => setTab("promotional")}>
          Promotional Products
        </TabButton>
        <TabButton active={tab === "offer"} onClick={() => setTab("offer")}>
          Add to an Offer
        </TabButton>
      </nav>

      {tab === "promotional" ? (
        <AdminPromoProductChannelList
          title="Promotional Products"
          tabLabel="Promotional Product List"
          addLabel="Promotional Products"
          pickerTitle="Add Product In Promotional"
          emptyTitle="No products found"
          assigned={assigned}
          catalog={catalog}
          categories={categories}
          showTodaysDealToggle
          persist={persist}
        />
      ) : (
        <AdminOfferAssignPanel
          promotions={promotions}
          catalog={catalog}
          categories={categories}
          assignToPromotion={assignToPromotion}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[#3897f0] text-white shadow-sm"
          : "bg-surface text-text-muted hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}

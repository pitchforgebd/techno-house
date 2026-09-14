import Link from "next/link";
import { Clock3, Flag, Grid2x2, Megaphone, Zap } from "lucide-react";
import type { PromotionOffersHubSnapshot } from "@/lib/admin/load-promotions-offers";

const CARDS = [
  {
    href: "/admin/promotions/campaigns",
    title: "Campaigns",
    description: "Homepage ribbons, category banners, and sitewide messaging",
    icon: Flag,
    iconClass: "bg-indigo-100 text-indigo-600",
    stats: (s: PromotionOffersHubSnapshot) => [
      { label: "Total Campaigns", value: s.campaignTotal, tone: "slate" },
      { label: "Campaign Active", value: s.campaignActive, tone: "indigo" },
    ],
  },
  {
    href: "/admin/promotions/products",
    title: "Promotional Products",
    description:
      "Select & import products for active promotional channels in one place",
    icon: Megaphone,
    iconClass: "bg-sky-100 text-sky-600",
    stats: (s: PromotionOffersHubSnapshot) => [
      { label: "Total Products", value: s.totalProducts, tone: "slate" },
      {
        label: "Assigned for Promotion",
        value: s.promotionalAssigned,
        tone: "cyan",
      },
    ],
  },
  {
    href: "/admin/promotions/category-discounts",
    title: "Category-Wise Discounts",
    description:
      "Apply automatic discounts to products based on their category",
    icon: Grid2x2,
    iconClass: "bg-fuchsia-100 text-fuchsia-600",
    stats: (s: PromotionOffersHubSnapshot) => [
      { label: "All Category", value: s.allCategories, tone: "slate" },
      { label: "Main Category", value: s.mainCategories, tone: "amber" },
    ],
  },
  {
    href: "/admin/flash-sales",
    title: "Flash Sale",
    description:
      "Create campaigns for limited-time sales with countdown timers.",
    icon: Zap,
    iconClass: "bg-rose-100 text-rose-600",
    stats: (s: PromotionOffersHubSnapshot) => [
      {
        label: "Total Campaign Created",
        value: s.flashTotal,
        tone: "slate",
      },
      { label: "Campaign Active", value: s.flashActive, tone: "rose" },
    ],
  },
  {
    href: "/admin/deals",
    title: "Today's Deal",
    description:
      "Handpick daily spotlight products with exclusive markdown prices",
    icon: Clock3,
    iconClass: "bg-orange-100 text-orange-600",
    stats: (s: PromotionOffersHubSnapshot) => [
      {
        label: "Currently Featured in the deal",
        value: s.todaysDealFeatured,
        tone: "orange",
        wide: true,
      },
    ],
  },
] as const;

const TONE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-800",
  indigo: "bg-indigo-50 text-indigo-800",
  cyan: "bg-cyan-50 text-cyan-800",
  amber: "bg-amber-50 text-amber-900",
  rose: "bg-rose-50 text-rose-800",
  orange: "bg-orange-50 text-orange-900",
};

export function AdminPromotionOffersHub({
  snapshot,
}: {
  snapshot: PromotionOffersHubSnapshot;
}) {
  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-[#eef0ff] via-white to-[#f7f8fc] px-6 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Promotion &amp; Offers
        </h1>
        <p className="mt-2 max-w-2xl text-body text-neutral-600">
          Create and manage all promotions, offers and discounted products from
          one place.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const stats = card.stats(snapshot);
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition hover:border-[#3897f0]/40 hover:shadow-md sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-neutral-900 group-hover:text-[#3897f0]">
                    {card.title}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {card.description}
                  </p>
                </div>
              </div>
              <div
                className={`mt-5 grid gap-2 ${stats.length > 1 ? "sm:grid-cols-2" : ""}`}
              >
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl px-3 py-3 text-center ${TONE[stat.tone]}`}
                  >
                    <p className="text-lg font-semibold tabular-nums">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-xs font-medium opacity-80">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

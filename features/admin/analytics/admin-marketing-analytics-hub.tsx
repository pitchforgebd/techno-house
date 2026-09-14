import Link from "next/link";
import {
  BarChart3,
  Code2,
  Infinity,
  Network,
  Search,
  ShoppingBag,
  Tags,
} from "lucide-react";

const MODULES = [
  {
    href: "/admin/integrations/ga4",
    title: "Google Analytics (GA4)",
    description:
      "Track visitor behavior, sales performance and conversion insights.",
    icon: BarChart3,
    iconClass: "bg-orange-100 text-orange-600",
  },
  {
    href: "/admin/integrations/gtm",
    title: "Google Tag Manager (GTM)",
    description: "Manage and deploy marketing tags without editing code.",
    icon: Tags,
    iconClass: "bg-sky-100 text-sky-600",
  },
  {
    href: "/admin/integrations/merchant-center",
    title: "Google Merchant Center",
    description: "Sync products with Google Shopping and product ads.",
    icon: ShoppingBag,
    iconClass: "bg-blue-100 text-blue-600",
  },
  {
    href: "/admin/integrations/facebook-catalog",
    title: "Meta Shop Sync (Catalog)",
    description: "Sync your store products with Facebook and Instagram Shops.",
    icon: Network,
    iconClass: "bg-[#1877F2]/15 text-[#1877F2]",
  },
  {
    href: "/admin/integrations/meta",
    title: "Meta Pixel",
    description: "Track customer actions and measure Meta ad performance.",
    icon: Code2,
    iconClass: "bg-sky-100 text-[#1877F2]",
  },
  {
    href: "/admin/integrations/meta-capi",
    title: "Meta Conversion API (CAPI)",
    description: "Send server-side conversion events directly to Meta securely.",
    icon: Infinity,
    iconClass: "bg-pink-100 text-pink-600",
  },
  {
    href: "/admin/sitemap",
    title: "Sitemap Generator",
    description: "Generate SEO-friendly sitemaps for better search indexing.",
    icon: Network,
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  {
    href: "/admin/integrations/custom-script",
    title: "Custom Scripts",
    description: "Add custom tracking codes, widgets or third-party scripts.",
    icon: Code2,
    iconClass: "bg-orange-100 text-orange-700",
  },
  {
    href: "/admin/seo",
    title: "Global SEO",
    description: "Configure default SEO settings for your entire website.",
    icon: Search,
    iconClass: "bg-violet-100 text-violet-700",
  },
] as const;

export function AdminMarketingAnalyticsHub() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Marketing Analytics
        </h1>
        <p className="mt-1 text-body text-neutral-500">
          Connect, track and optimize your store marketing from one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.href}
              href={module.href}
              className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm transition hover:border-[#3897f0]/35 hover:shadow-md sm:p-6"
            >
              <span
                className={`inline-flex size-11 items-center justify-center rounded-xl ${module.iconClass}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-base font-semibold text-neutral-900">
                {module.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {module.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

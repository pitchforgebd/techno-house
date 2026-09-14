"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  FileText,
  ImageIcon,
  Lock,
  Palette,
  PanelsTopLeft,
  Share2,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StudioCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
};

const GROUPS: { label: string; cards: StudioCard[] }[] = [
  {
    label: "Brand & style",
    cards: [
      {
        href: "/admin/design-studio/appearance",
        title: "Appearance",
        description: "Brand and UI colors",
        icon: Palette,
        iconClass: "bg-fuchsia-100 text-fuchsia-700",
      },
      {
        href: "/admin/design-studio/typography",
        title: "Typography",
        description: "Storefront font choices",
        icon: Type,
        iconClass: "bg-violet-100 text-violet-600",
      },
      {
        href: "/admin/design-studio/logo",
        title: "Logo & favicon",
        description: "Upload brand assets",
        icon: ImageIcon,
        iconClass: "bg-violet-50 text-violet-500",
      },
    ],
  },
  {
    label: "Content & pages",
    cards: [
      {
        href: "/admin/design-studio/banners",
        title: "Banners & sliders",
        description: "Flash deal, category, and promo banners",
        icon: SlidersHorizontal,
        iconClass: "bg-amber-100 text-amber-700",
      },
      {
        href: "/admin/design-studio/pages",
        title: "Pages",
        description: "About, contact, policies, FAQ",
        icon: FileText,
        iconClass: "bg-amber-50 text-amber-600",
      },
      {
        href: "/admin/design-studio/auth",
        title: "Auth pages",
        description: "Login & register layout",
        icon: Lock,
        iconClass: "bg-amber-100 text-amber-800",
      },
    ],
  },
  {
    label: "Footer widgets",
    cards: [
      {
        href: "/admin/design-studio/footer-widgets",
        title: "Footer widgets",
        description: "About, social, contact, copyright",
        icon: Share2,
        iconClass: "bg-emerald-100 text-emerald-700",
      },
    ],
  },
  {
    label: "Admin panel",
    cards: [
      {
        href: "/admin/design-studio/admin-navbar",
        title: "Admin navbar",
        description: "Navbar background & text color",
        icon: PanelsTopLeft,
        iconClass: "bg-emerald-100 text-emerald-800",
      },
    ],
  },
];

export function AdminDesignStudioHub() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-10 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Design Studio
        </h1>
        <p className="mt-1 text-body text-neutral-500">
          Manage brand style, CMS pages, banners, and footer widgets by feature.
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.label} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {group.label}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group relative rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-[#3897f0]/35 hover:shadow-md"
                >
                  <ChevronRight
                    className="absolute right-4 top-4 size-4 text-neutral-300 group-hover:text-neutral-500"
                    aria-hidden
                  />
                  <span
                    className={`inline-flex size-10 items-center justify-center rounded-lg ${card.iconClass}`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-neutral-900">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {card.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

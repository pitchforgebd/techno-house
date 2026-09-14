"use client";

import Link from "next/link";
import {
  FileText,
  MapPin,
  Printer,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/cn";

const CARDS = [
  {
    href: "/admin/settings/general",
    title: "General Settings",
    description: "Store identity, contact and timezone",
    icon: Settings,
    iconClass: "bg-sky-100 text-[#3897f0]",
  },
  {
    href: "/admin/settings/orders",
    title: "Order Configuration",
    description: "Order codes, minimum amount and defaults",
    icon: ShoppingCart,
    iconClass: "bg-sky-100 text-[#3897f0]",
  },
  {
    href: "/admin/settings/tax",
    title: "Vat, TAX & Other Charges",
    description: "Tax rates and additional charges",
    icon: Receipt,
    iconClass: "bg-sky-100 text-[#3897f0]",
  },
  {
    href: "/admin/settings/pickup-points",
    title: "Pickup Points",
    description: "Customer pickup locations",
    icon: MapPin,
    iconClass: "bg-sky-100 text-[#3897f0]",
  },
  {
    href: "/admin/settings/invoice",
    title: "Invoice Settings",
    description: "Invoice prefix, footer and branding",
    icon: FileText,
    iconClass: "bg-sky-100 text-[#3897f0]",
  },
  {
    href: "/admin/settings/tracking",
    title: "Order Tracking",
    description: "Tracking URL templates and notifications",
    icon: Truck,
    iconClass: "bg-sky-100 text-[#3897f0]",
  },
  {
    href: "/admin/settings/shipping-label",
    title: "Shipping Label",
    description: "Label size and print defaults",
    icon: Tag,
    iconClass: "bg-sky-100 text-[#3897f0]",
  },
  {
    href: "/admin/settings/thermal-printer",
    title: "Thermal Printer Settings",
    description: "Receipt printer connection and layout",
    icon: Printer,
    iconClass: "bg-sky-100 text-[#3897f0]",
  },
] as const;

export function AdminBusinessSettingsHub() {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Business Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage core business operations including orders, invoicing and
          delivery
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-[#3897f0]/40 hover:shadow-md"
            >
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-lg",
                  card.iconClass,
                )}
              >
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-neutral-900 group-hover:text-[#3897f0]">
                  {card.title}
                </span>
                <span className="mt-1 block text-sm text-neutral-500">
                  {card.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

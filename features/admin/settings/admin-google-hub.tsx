"use client";

import Link from "next/link";
import { Map, Shield, Flame } from "lucide-react";

const LINKS = [
  {
    href: "/admin/settings/google/recaptcha",
    title: "Google reCAPTCHA",
    description: "Bot protection for login and forms",
    icon: Shield,
  },
  {
    href: "/admin/settings/google/map",
    title: "Google Map",
    description: "Maps API for address and pickup",
    icon: Map,
  },
  {
    href: "/admin/settings/google/firebase",
    title: "Google Firebase",
    description: "Push notifications and analytics",
    icon: Flame,
  },
] as const;

export function AdminGoogleHub() {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Google
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          reCAPTCHA, Maps and Firebase integrations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-[#3897f0]/40"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-sky-100 text-[#3897f0]">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-neutral-900 group-hover:text-[#3897f0]">
                  {link.title}
                </span>
                <span className="mt-1 block text-sm text-neutral-500">
                  {link.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

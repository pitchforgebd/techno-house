import type { ReactNode } from "react";
import { CategoryNav } from "@/components/layout/category-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TopBar } from "@/components/layout/top-bar";

export default function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-text"
      >
        Skip to content
      </a>
      <TopBar />
      <div className="sticky top-0 z-40">
        <SiteHeader />
        <CategoryNav />
      </div>
      <main id="main-content" className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
}

import type { ReactNode } from "react";
import type { Metadata } from "next";
import { CategoryNav } from "@/components/layout/category-nav";
import { MarqueeNoticeBar } from "@/components/layout/marquee-notice-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TopBar } from "@/components/layout/top-bar";
import { StorefrontAnalytics } from "@/components/analytics/storefront-analytics";
import { CustomScriptSlot } from "@/components/analytics/custom-script-slot";
import { StorefrontChatWidget } from "@/components/chat/storefront-chat-widget";
import { DynamicPopup } from "@/components/storefront/dynamic-popup";
import { SaleAlertToast } from "@/components/storefront/sale-alert-toast";
import { SiteAlert } from "@/components/storefront/site-alert";
import { CustomerSessionProvider } from "@/features/account/customer-session-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getMyB2BAccount } from "@/lib/b2b/applications";
import { isFeatureFlagEnabled } from "@/lib/admin/feature-flags-config";
import { getStorefrontBranding } from "@/lib/business/storefront-branding";
import { EMPTY_CART } from "@/lib/cart/cart";
import { getPersistedCart, usesCartDatabase } from "@/lib/cart/persist";
import { getStorefrontCustomScripts } from "@/lib/analytics/custom-scripts";
import { getFooterWidgetsConfig } from "@/lib/content/footer-settings";
import { getStorefrontThemeCss } from "@/lib/design/theme-settings";
import { getActiveAlertForStorefront } from "@/lib/marketing/alerts";
import { getActivePopupForStorefront } from "@/lib/marketing/popups";
import {
  getRecentSaleAlertEvents,
  getSaleAlertSettings,
} from "@/lib/marketing/sale-alerts";
import { getStorefrontSeoMetadata } from "@/lib/seo/config";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, branding] = await Promise.all([
    getStorefrontSeoMetadata(),
    getStorefrontBranding(),
  ]);
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    icons: branding.faviconSrc
      ? { icon: branding.faviconSrc }
      : undefined,
    openGraph: {
      type: "website",
      siteName: branding.storeName,
      title: seo.title,
      description: seo.description,
      locale: "en_BD",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  };
}

function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-text">
        We&apos;ll be right back
      </h1>
      <p className="max-w-md text-body text-text-muted">
        Techno House is down for scheduled maintenance. Please check back
        shortly.
      </p>
    </div>
  );
}

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const maintenanceMode = await isFeatureFlagEnabled("maintenance");
  if (maintenanceMode) {
    return <MaintenancePage />;
  }

  const customer = await getCustomerSession();
  // Resolved once per request so every client component can branch on it
  // without each one hitting the database.
  const b2bAccount = customer
    ? await getMyB2BAccount(customer.userId)
    : null;
  const persist = usesCartDatabase();
  const [
    initialCart,
    popup,
    alert,
    saleAlertSettings,
    saleAlertEvents,
    customScripts,
    themeCss,
    footer,
  ] = await Promise.all([
    persist ? getPersistedCart() : Promise.resolve(EMPTY_CART),
    getActivePopupForStorefront(),
    getActiveAlertForStorefront(),
    getSaleAlertSettings(),
    getRecentSaleAlertEvents(),
    getStorefrontCustomScripts(),
    getStorefrontThemeCss(),
    getFooterWidgetsConfig(),
  ]);
  const hasMarquee = footer.marqueeEnabled && Boolean(footer.marqueeText);

  return (
    <CustomerSessionProvider
      session={customer}
      b2b={
        b2bAccount
          ? { status: b2bAccount.status, company: b2bAccount.company }
          : null
      }
    >
      <CartProvider
        key={customer?.userId ?? "guest"}
        persist={persist}
        initial={initialCart}
      >
        <div className="flex min-h-screen flex-col">
          {themeCss ? (
            <style
              id="th-design-theme"
              dangerouslySetInnerHTML={{ __html: themeCss }}
            />
          ) : null}
          <CustomScriptSlot html={customScripts.headerScript} />
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
          <main
            id="main-content"
            className={cn("flex-1", hasMarquee ? "pb-28 md:pb-11" : "pb-16 md:pb-0")}
          >
            {children}
          </main>
          <SiteFooter />
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col">
            {hasMarquee ? <MarqueeNoticeBar text={footer.marqueeText} /> : null}
            <MobileBottomNav />
          </div>
          <StorefrontAnalytics />
          <StorefrontChatWidget pushedUpForMarquee={hasMarquee} />
          <DynamicPopup popup={popup} />
          <SiteAlert alert={alert} />
          <SaleAlertToast
            events={saleAlertEvents}
            minIntervalSeconds={saleAlertSettings.minIntervalSeconds}
            maxIntervalSeconds={saleAlertSettings.maxIntervalSeconds}
          />
          <CustomScriptSlot html={customScripts.footerScript} />
        </div>
      </CartProvider>
    </CustomerSessionProvider>
  );
}

import {
  HomeFlashBanner,
  HomePromoBanners,
} from "@/features/home/home-banners";
import { HomeBrands } from "@/features/home/home-brands";
import { HomeCategories } from "@/features/home/home-categories";
import { HomeContent } from "@/features/home/home-content";
import { HomeDeals } from "@/features/home/home-deals";
import { HomeFeatured } from "@/features/home/home-featured";
import { HomeHero } from "@/features/home/home-hero";
import { HomePcBuilder } from "@/features/home/home-pc-builder";
import { HomeStoreInfo } from "@/features/home/home-store-info";
import { HomeTrust } from "@/features/home/home-trust";
import { getStorefrontHomeBanners } from "@/lib/design/home-banners";
import { getHomeSeoHtml } from "@/lib/seo/home-content";

export async function HomePage() {
  const [
    heroBanners,
    heroSideBanners,
    flashBanners,
    promoBanners,
    storeInfoHtml,
  ] = await Promise.all([
    getStorefrontHomeBanners("hero"),
    getStorefrontHomeBanners("hero-side"),
    getStorefrontHomeBanners("flash-wide"),
    getStorefrontHomeBanners("promo-tile"),
    getHomeSeoHtml(),
  ]);

  return (
    <>
      <HomeHero banners={heroBanners} sideBanners={heroSideBanners} />
      <div className="mx-auto flex max-w-content flex-col gap-16 px-4 py-12 md:gap-20 md:py-16">
        <HomeCategories />
        <HomeFlashBanner banner={flashBanners[0] ?? null} />
        <HomeFeatured />
        <HomeDeals />
        <HomePromoBanners banners={promoBanners} />
        <HomePcBuilder />
        <HomeBrands />
        <HomeTrust />
        <HomeContent />
        <HomeStoreInfo html={storeInfoHtml} />
      </div>
    </>
  );
}

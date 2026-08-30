import { HomeBrands } from "@/features/home/home-brands";
import { HomeCategories } from "@/features/home/home-categories";
import { HomeContent } from "@/features/home/home-content";
import { HomeDeals } from "@/features/home/home-deals";
import { HomeFeatured } from "@/features/home/home-featured";
import { HomeHero } from "@/features/home/home-hero";
import { HomePcBuilder } from "@/features/home/home-pc-builder";
import { HomeTrust } from "@/features/home/home-trust";

export async function HomePage() {
  return (
    <>
      <HomeHero />
      <div className="mx-auto flex max-w-content flex-col gap-16 px-4 py-12 md:gap-20 md:py-16">
        <HomeCategories />
        <HomeFeatured />
        <HomeDeals />
        <HomePcBuilder />
        <HomeBrands />
        <HomeTrust />
        <HomeContent />
      </div>
    </>
  );
}

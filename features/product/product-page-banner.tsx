import Image from "next/image";
import Link from "next/link";
import type { StorefrontHomeBanner } from "@/lib/design/home-banners";

/**
 * Campaign strip under the buy box (cashback offers and the like), managed
 * in Design Studio → Banners & Sliders → "Product page banner". Renders
 * nothing until the operator adds one, same as every other banner slot.
 */
export function ProductPageBanner({
  banner,
}: {
  banner: StorefrontHomeBanner | null;
}) {
  if (!banner) {
    return null;
  }

  const image = (
    <Image
      src={banner.image}
      alt={banner.imageAlt || banner.title}
      width={1200}
      height={260}
      className="h-auto w-full object-cover"
      sizes="(min-width: 1024px) 50vw, 100vw"
    />
  );

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
      {banner.href ? (
        <Link href={banner.href} className="block">
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  );
}

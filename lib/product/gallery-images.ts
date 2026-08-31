import type { ProductImage } from "@/lib/data";

export const MIN_PRODUCT_GALLERY_IMAGES = 6;

const VIEW_LABELS = [
  "front view",
  "angle view",
  "detail",
  "ports",
  "packaging",
  "in use",
] as const;

export function buildProductGalleryImages(
  images: ProductImage[],
  fallback: ProductImage,
  productName: string,
  minimum = MIN_PRODUCT_GALLERY_IMAGES,
): ProductImage[] {
  const base = images.length > 0 ? [...images] : [fallback];
  if (base.length >= minimum) {
    return base;
  }

  const gallery = [...base];
  let index = 0;
  while (gallery.length < minimum) {
    const source = base[index % base.length];
    if (!source) {
      break;
    }
    const view = VIEW_LABELS[gallery.length % VIEW_LABELS.length];
    const separator = source.src.includes("?") ? "&" : "?";
    gallery.push({
      src: `${source.src}${separator}th=${gallery.length + 1}`,
      alt: `${productName} — ${view}`,
    });
    index += 1;
  }

  return gallery;
}

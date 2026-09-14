import type { ProductImage } from "@/lib/data";

/**
 * Build the PDP gallery list from stored images.
 * Shows exactly what was uploaded (plus a single fallback when empty).
 * Does not pad/duplicate frames to a fake count.
 */
export function buildProductGalleryImages(
  images: ProductImage[],
  fallback: ProductImage,
  _productName?: string,
): ProductImage[] {
  if (images.length > 0) {
    return images;
  }
  return [fallback];
}

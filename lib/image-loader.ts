/**
 * Custom `next/image` loader (next.config.ts `images.loader: "custom"`).
 *
 * Self-hosted Next.js (`next start`) scans `public/` once at process start to
 * decide which local paths it will serve/optimize. Admin uploads land under
 * `public/uploads/**` at runtime, after that scan already ran, so the built-in
 * image optimizer's internal fetch for a freshly uploaded file 400s until the
 * next restart — indefinitely recurring on a site where staff upload product/
 * brand/banner images continuously. Nginx now serves `/uploads/*` directly
 * (see deployment notes) and always reads the current disk contents, so
 * uploaded sources bypass `/_next/image` entirely and go straight to that
 * reliable path. Everything else (Unsplash, bundled `/public` demo assets)
 * keeps the normal optimizer, unchanged.
 */
type ImageLoaderParams = {
  src: string;
  width: number;
  quality?: number;
};

export default function imageLoader({ src, width, quality }: ImageLoaderParams): string {
  if (src.startsWith("/uploads/")) {
    return src;
  }
  const params = new URLSearchParams({
    url: src,
    w: width.toString(),
    q: (quality ?? 75).toString(),
  });
  return `/_next/image?${params.toString()}`;
}

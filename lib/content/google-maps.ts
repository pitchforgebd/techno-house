/**
 * Turns a Google Maps share/place link into an embeddable iframe `src`.
 *
 * Only accepts google.com hosts — the storefront footer puts this straight
 * into an <iframe>, so anything else (including a goo.gl short link, which
 * can't be normalized without following its redirect) is left un-embedded;
 * the plain "View on Google Maps" link still works for those.
 */
const GOOGLE_MAPS_HOSTS = new Set(["maps.google.com", "www.google.com", "google.com"]);

export function googleMapsEmbedSrc(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }
  if (!GOOGLE_MAPS_HOSTS.has(url.hostname)) {
    return null;
  }
  if (url.pathname.includes("/maps/embed")) {
    return url.toString();
  }
  if (url.pathname.startsWith("/maps")) {
    url.searchParams.set("output", "embed");
    return url.toString();
  }
  return null;
}

/**
 * Hosted checkout redirect allow-list (P13-T04).
 * Never send the browser to a URL the gateway did not own.
 */
const ALLOWED_HOST_SUFFIXES = [
  ".sslcommerz.com",
  "sslcommerz.com",
  ".bka.sh",
  "bka.sh",
  ".bkash.com",
  "bkash.com",
  ".mynagad.com",
  "mynagad.com",
  ".nagad.com.bd",
  "nagad.com.bd",
];

export function isAllowedPaymentRedirect(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix),
  );
}

export function takaAmount(amount: number): string {
  return `${amount}.00`;
}

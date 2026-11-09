/**
 * JSON-LD (schema.org) builders (SEO phase 3). Every field comes from data
 * the calling page already shows — nothing here invents a rating, review,
 * price, availability, shipping or return term.
 *
 * Deliberately NOT emitted:
 *   - aggregateRating / review: the product page shows rating stars even with
 *     zero reviews; structured data must not repeat that (operator decision,
 *     SEO phase 3). Do not add them back without real, moderated reviews.
 *   - shippingDetails / hasMerchantReturnPolicy: the live /shipping and
 *     /returns pages are still placeholders, so there are no stated terms to
 *     describe. Add them only once those pages state real rates and rules.
 */
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs";
import type { StorefrontBranding } from "@/lib/business/storefront-branding";
import {
  isPublishablePrice,
  type DisplayedOffer,
} from "@/lib/catalog/displayed-offer";
import type { ProductDetail, StockStatus } from "@/lib/data";
import { canonicalUrl } from "@/lib/seo/canonical";
import { SITE_NAME } from "@/lib/seo/page-meta";

const CONTEXT = "https://schema.org";
const PLACEHOLDER_IMAGE = "/products/placeholder.svg";

export const ORGANIZATION_ID = () => `${canonicalUrl("/")}#organization`;
export const STORE_ID = () => `${canonicalUrl("/")}#store`;

const AVAILABILITY: Record<StockStatus, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
};

/**
 * Absolute URL for an image/link: site paths ("/uploads/…") get the
 * canonical origin, absolute http(s) URLs are kept, anything else (empty,
 * data:, relative) is dropped.
 */
export function absoluteUrl(src: string | null | undefined): string | undefined {
  const value = src?.trim();
  if (!value) {
    return undefined;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (value.startsWith("/") && !value.startsWith("//")) {
    return canonicalUrl(value);
  }
  return undefined;
}

/**
 * Bangladeshi phone number → E.164 (+8801XXXXXXXXX). Accepts "01611-305338",
 * "0 1410-305338", "+880 1611 305338", "8801611305338". Anything that is not
 * an 11-digit 01… mobile/landline number returns null (left out, not guessed).
 */
export function bdPhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
  return /^0\d{10}$/.test(local) ? `+880${local.slice(1)}` : null;
}

/** Every distinct phone number in the branding (primary + extra), E.164. */
export function brandingPhones(branding: StorefrontBranding): string[] {
  const raw = [branding.phone, ...branding.extraPhones]
    .flatMap((value) => value.split(/[,;/]|\bor\b/i))
    .map((value) => bdPhoneE164(value))
    .filter((value): value is string => Boolean(value));
  return [...new Set(raw)];
}

/**
 * The shop's location (85 Laboratory Road, New Elephant Road, Dhaka-1205),
 * coordinates confirmed by the operator on 2026-11-09. The stored map link is
 * a maps.app.goo.gl short link that carries no coordinates, so they live here.
 */
export const STORE_GEO = {
  "@type": "GeoCoordinates",
  latitude: 23.739561,
  longitude: 90.385072,
} as const;

/** Footer social links that are real external profiles (not "/contact"). */
export function sameAsLinks(links: { href: string }[]): string[] {
  return [
    ...new Set(
      links
        .map((link) => link.href.trim())
        .filter((href) => /^https:\/\/[^/\s]+\.[^/\s]+/i.test(href)),
    ),
  ];
}

function postalAddress(branding: StorefrontBranding) {
  if (!branding.address && !branding.city) {
    return undefined;
  }
  // "Dhaka, Bangladesh" → locality "Dhaka"; the postcode is read from the
  // stored address ("… Dhaka-1205"), never assumed.
  const locality = branding.city.split(",")[0]?.trim() || undefined;
  const postalCode = branding.address.match(/\b(\d{4})\b(?!.*\b\d{4}\b)/)?.[1];
  return {
    "@type": "PostalAddress",
    streetAddress: branding.address || undefined,
    addressLocality: locality,
    postalCode,
    addressCountry: "BD",
  };
}

export function organizationJsonLd(
  branding: StorefrontBranding,
  options: { sameAs?: string[] } = {},
) {
  const phones = brandingPhones(branding);
  const sameAs = options.sameAs ?? [];
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": ORGANIZATION_ID(),
    name: branding.storeName,
    url: canonicalUrl("/"),
    logo: absoluteUrl(branding.logoSrc),
    email: branding.supportEmail || undefined,
    address: postalAddress(branding),
    contactPoint:
      phones.length > 0
        ? phones.map((telephone) => ({
            "@type": "ContactPoint",
            telephone,
            contactType: "customer service",
            areaServed: "BD",
            availableLanguage: ["en", "bn"],
            ...(branding.supportEmail ? { email: branding.supportEmail } : {}),
          }))
        : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

/**
 * The physical shop (home and contact pages). Address, phone and map link are
 * the same values the footer shows; geo is the operator-confirmed location.
 *
 * No openingHours / openingHoursSpecification on purpose: the "9:00–22:00"
 * on the site is customer SUPPORT hours, not confirmed shop opening hours.
 * Add them only once the real shop hours (and days) are confirmed.
 */
export function electronicsStoreJsonLd(
  branding: StorefrontBranding,
  options: { sameAs?: string[] } = {},
) {
  const phones = brandingPhones(branding);
  const logo = absoluteUrl(branding.logoSrc);
  const sameAs = options.sameAs ?? [];
  return {
    "@context": CONTEXT,
    "@type": "ElectronicsStore",
    "@id": STORE_ID(),
    name: branding.storeName,
    url: canonicalUrl("/"),
    image: logo,
    logo,
    telephone: phones[0],
    email: branding.supportEmail || undefined,
    address: postalAddress(branding),
    geo: STORE_GEO,
    hasMap: absoluteUrl(branding.googleMapsUrl),
    priceRange: "৳৳",
    currenciesAccepted: "BDT",
    parentOrganization: { "@id": ORGANIZATION_ID() },
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

export function websiteJsonLd(branding: StorefrontBranding) {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: branding.storeName,
    url: canonicalUrl("/"),
    publisher: { "@id": ORGANIZATION_ID() },
    potentialAction: {
      "@type": "SearchAction",
      target: `${canonicalUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Mirrors whatever `BreadcrumbItem[]` is already rendered as the visible
 * `<Breadcrumbs>` trail — the schema and the on-page markup must agree, so
 * callers build one array and pass it to both rather than maintaining two.
 * The last (current-page) crumb has no `href`, matching Google's guidance
 * that the terminal item's `item` URL may be omitted.
 */
export function breadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? canonicalUrl(item.href) : undefined,
    })),
  };
}

/**
 * The products listed on the current page of a category, in display order.
 * Summary-page form (position + url + name), not nested Product objects —
 * each product's own page carries its full Product markup.
 */
export function itemListJsonLd(
  items: { slug: string; name: string }[],
  options: { name: string; startPosition?: number },
) {
  const start = options.startPosition ?? 1;
  return {
    "@context": CONTEXT,
    "@type": "ItemList",
    name: options.name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: start + index,
      url: canonicalUrl(`/product/${item.slug}`),
      name: item.name,
    })),
  };
}

function plainText(html: string | null | undefined): string | undefined {
  if (!html) {
    return undefined;
  }
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 5000) : undefined;
}

/** Product images as absolute URLs; the "no photo" placeholder is not one. */
function productImages(offer: DisplayedOffer): string[] {
  const urls = offer.images
    .map((image) => image.src)
    .filter((src) => src && src !== PLACEHOLDER_IMAGE)
    .map((src) => absoluteUrl(src))
    .filter((src): src is string => Boolean(src));
  return [...new Set(urls)];
}

/** "2026-11-30T…" → "2026-11-30"; null when it is not a future date. */
function futureDate(iso: string | null, now: Date): string | undefined {
  if (!iso) {
    return undefined;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() <= now.getTime()) {
    return undefined;
  }
  return date.toISOString().slice(0, 10);
}

export function productJsonLd({
  product,
  offer,
  path,
  now = new Date(),
}: {
  product: Pick<
    ProductDetail,
    "brandName" | "modelNumber" | "overview" | "overviewHtml" | "discountEndsAt"
  >;
  /** What the page displays — `displayedOffer(product, linkedVariant)`. */
  offer: DisplayedOffer;
  path: string;
  now?: Date;
}) {
  const url = canonicalUrl(path);
  const images = productImages(offer);
  // Offers only when the page itself shows a real price: never price 0,
  // never for Up Coming or out-of-stock-without-pre-order (the page hides
  // the price there, so the markup does too).
  const showOffer = !offer.priceHidden && isPublishablePrice(offer.price);
  const discounted =
    offer.compareAtPrice != null &&
    offer.compareAtPrice.amount > offer.price.amount;
  return {
    "@context": CONTEXT,
    "@type": "Product",
    "@id": `${url}#product`,
    name: offer.name,
    url,
    image: images.length > 0 ? images : undefined,
    description:
      plainText(product.overviewHtml) ||
      product.overview.map((line) => line.trim()).filter(Boolean).join(" ") ||
      undefined,
    sku: offer.sku || undefined,
    mpn: product.modelNumber?.trim() || undefined,
    brand: product.brandName
      ? { "@type": "Brand", name: product.brandName }
      : undefined,
    offers: showOffer
      ? {
          "@type": "Offer",
          url,
          priceCurrency: offer.price.currency,
          price: offer.price.amount,
          availability: offer.isPreOrder
            ? "https://schema.org/PreOrder"
            : AVAILABILITY[offer.stockStatus],
          itemCondition: "https://schema.org/NewCondition",
          // The sale price is only valid until the discount window closes.
          priceValidUntil: discounted
            ? futureDate(product.discountEndsAt, now)
            : undefined,
          seller: {
            "@type": "Organization",
            "@id": ORGANIZATION_ID(),
            name: SITE_NAME,
          },
        }
      : undefined,
  };
}

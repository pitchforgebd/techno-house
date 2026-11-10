/**
 * Store policy values: the single source of truth for every contact detail
 * and policy number the trust pages (/about, /contact, /faq, /warranty,
 * /shipping, /returns, /terms, /privacy) quote (SEO phase 6).
 *
 * Section 0 of docs/SITE-PAGES-CONTENT.md. Change a value here and every page
 * that quotes it changes with it: the seeded page bodies hold `{{tokens}}`
 * (see `POLICY_TOKENS`), which `StorefrontContentPage` replaces at render
 * time. The same values feed the Organization / ElectronicsStore
 * `contactPoint` and the Product offer's return policy and delivery times.
 *
 * The owner approved these numbers as defaults on 2026-11-10.
 */

/** Showroom: 85, Laboratory Road (Coffee House Goli), New Elephant Road, Dhaka-1205. */
const SHOWROOM = {
  unit: "85",
  street: "Laboratory Road",
  landmark: "Coffee House Goli",
  area: "New Elephant Road",
  city: "Dhaka",
  postalCode: "1205",
  country: "Bangladesh",
} as const;

/** RMA (warranty and returns) office, one door along, on the second floor. */
const RMA_OFFICE = {
  unit: "85/1",
  floor: "2nd Floor",
  street: SHOWROOM.street,
  landmark: SHOWROOM.landmark,
  area: SHOWROOM.area,
  city: SHOWROOM.city,
  postalCode: SHOWROOM.postalCode,
} as const;

const cityPostal = `${SHOWROOM.city}-${SHOWROOM.postalCode}`;

/** Sales / support numbers; the first one is the number the pages lead with. */
const PHONES_SALES = ["01611-305338", "01410-305338", "01410-881771"] as const;

export const POLICIES = {
  businessName: "Techno House",

  showroom: SHOWROOM,
  rmaOffice: RMA_OFFICE,
  /** "85, Laboratory Road (Coffee House Goli), New Elephant Road, Dhaka-1205, Bangladesh" */
  showroomAddress: `${SHOWROOM.unit}, ${SHOWROOM.street} (${SHOWROOM.landmark}), ${SHOWROOM.area}, ${cityPostal}, ${SHOWROOM.country}`,
  /** "85/1, 2nd Floor, Laboratory Road (Coffee House Goli), New Elephant Road, Dhaka-1205" */
  rmaAddress: `${RMA_OFFICE.unit}, ${RMA_OFFICE.floor}, ${RMA_OFFICE.street} (${RMA_OFFICE.landmark}), ${RMA_OFFICE.area}, ${cityPostal}`,

  phonesSales: PHONES_SALES,
  phonePrimary: PHONES_SALES[0],
  phoneRma: "01311-211433",
  emailSupport: "support@technohouse.com.bd",
  emailInfo: "info@technohouse.com.bd",

  /** Customer support hours (phone/email), NOT confirmed shop opening hours. */
  supportHoursFrom: "9:00 AM",
  supportHoursTo: "10:00 PM",

  /** Wrong item, missing item or visible transit damage: report within N hours of delivery. */
  reportWrongOrDamagedHours: 24,
  /** Dead on arrival: report within N days of delivery. */
  reportDeadOnArrivalDays: 3,
  /** Approved refunds are processed within N working days of approval. */
  refundWorkingDays: 7,

  /** Delivery windows, in working days counted from order confirmation. */
  dhakaDeliveryWorkingDays: { min: 1, max: 3 },
  outsideDhakaDeliveryWorkingDays: { min: 2, max: 7 },
  dispatchAfterConfirmationWorkingDays: { min: 1, max: 2 },

  /** Who pays return shipping (stated in words on /returns; not a fee table). */
  returnShippingBorneBy:
    "Techno House when the error is ours (wrong item, damaged in transit, dead on arrival); customer otherwise",
} as const;

/**
 * Offer-level `hasMerchantReturnPolicy` markup (see `merchantReturnPolicyJsonLd`
 * in lib/seo/json-ld.ts). OFF on purpose: schema.org can only say "finite
 * return window, N days", which Google reads as general returns within N days.
 * /returns accepts returns only for a wrong, missing or damaged item (24 hours)
 * or a dead-on-arrival one (3 days), not change of mind, so the markup would
 * not match the visible policy. Turn on only if the owner decides the
 * wording/policy should change (or a schema value that fits is found).
 */
export const MERCHANT_RETURN_POLICY_MARKUP = false;

/** "1–3" (en dash, as the pages print it). */
export function workingDayRange(range: { min: number; max: number }): string {
  return `${range.min}–${range.max}`;
}

/**
 * Every `{{token}}` a trust-page body may contain, with its text. The seed
 * script (scripts/seed-trust-pages.mjs) swaps these exact strings for their
 * tokens; the storefront swaps them back at render time. Longer values that
 * contain shorter ones (the full phone list contains the primary number)
 * are matched first by the seed, so order here does not matter.
 *
 * `googleMapsUrl` is not here: it is the Admin → Business Settings map link
 * (the same one the ElectronicsStore `hasMap` uses) and is supplied by the
 * page at render time.
 */
export const POLICY_TOKENS: Record<string, string> = {
  showroomAddress: POLICIES.showroomAddress,
  // The same address without the country, as it reads in running text.
  showroomAddressLocal: `${SHOWROOM.unit}, ${SHOWROOM.street} (${SHOWROOM.landmark}), ${SHOWROOM.area}, ${cityPostal}`,
  // Short forms: "85, Laboratory Road, New Elephant Road" (pickup line) and
  // "85 Laboratory Road, New Elephant Road, Dhaka-1205" (contact meta description).
  showroomStreet: `${SHOWROOM.unit}, ${SHOWROOM.street}, ${SHOWROOM.area}`,
  showroomStreetPostal: `${SHOWROOM.unit} ${SHOWROOM.street}, ${SHOWROOM.area}, ${cityPostal}`,
  rmaAddress: POLICIES.rmaAddress,
  // "85/1, 2nd Floor, Laboratory Road, New Elephant Road, Dhaka-1205"
  rmaAddressShort: `${RMA_OFFICE.unit}, ${RMA_OFFICE.floor}, ${RMA_OFFICE.street}, ${RMA_OFFICE.area}, ${cityPostal}`,
  // "85/1, 2nd Floor, Laboratory Road"
  rmaStreet: `${RMA_OFFICE.unit}, ${RMA_OFFICE.floor}, ${RMA_OFFICE.street}`,

  phonesSales: PHONES_SALES.join(", "),
  phonePrimary: POLICIES.phonePrimary,
  phoneRma: POLICIES.phoneRma,
  emailSupport: POLICIES.emailSupport,
  emailInfo: POLICIES.emailInfo,
  supportHours: `${POLICIES.supportHoursFrom} – ${POLICIES.supportHoursTo}`,
  supportHoursFrom: POLICIES.supportHoursFrom,
  supportHoursTo: POLICIES.supportHoursTo,

  reportWrongOrDamagedHours: String(POLICIES.reportWrongOrDamagedHours),
  reportDeadOnArrivalDays: String(POLICIES.reportDeadOnArrivalDays),
  refundWorkingDays: String(POLICIES.refundWorkingDays),
  dhakaDeliveryWorkingDays: workingDayRange(POLICIES.dhakaDeliveryWorkingDays),
  outsideDhakaDeliveryWorkingDays: workingDayRange(
    POLICIES.outsideDhakaDeliveryWorkingDays,
  ),
  dispatchAfterConfirmationWorkingDays: workingDayRange(
    POLICIES.dispatchAfterConfirmationWorkingDays,
  ),
};

const TOKEN_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Replace `{{token}}`s in page HTML with their (HTML-escaped) values. A token
 * with no value is left as written so it is easy to spot, never blanked.
 * Run BEFORE sanitizing, so an inserted URL still goes through the sanitizer.
 */
export function fillPolicyTokens(
  html: string,
  extra: Record<string, string | null | undefined> = {},
): string {
  return html.replace(TOKEN_PATTERN, (whole, name: string) => {
    const value = extra[name] ?? POLICY_TOKENS[name];
    return value ? escapeHtml(value) : whole;
  });
}

/** The same replacement for plain text (meta title / description), unescaped. */
export function fillPolicyTokensText(text: string): string {
  return text.replace(
    TOKEN_PATTERN,
    (whole, name: string) => POLICY_TOKENS[name] ?? whole,
  );
}

/** "01611-305338" → "+8801611305338". */
export function policyPhoneE164(phone: string): string {
  return `+880${phone.replace(/\D/g, "").slice(1)}`;
}

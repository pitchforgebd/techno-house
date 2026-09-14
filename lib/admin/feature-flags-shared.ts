/**
 * Client-safe feature flag catalogue (no Prisma / Node imports).
 *
 * The fixed set of known flag ids, their labels/icons/sections, and default
 * enabled state. Toggle state persists to `FeatureFlagSetting` (Admin →
 * Settings → Features). A flag with no `statusNote` is read by real
 * enforcement code; one with a `statusNote` either has no backing feature to
 * gate yet, or is superseded by a more specific real setting elsewhere.
 */

export type FeatureFlagItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
  oauthHint?: boolean;
  /** Shown under the description — explains a superseded or not-yet-built flag. */
  statusNote?: string;
};

export type FeatureFlagSection = {
  id: string;
  title: string;
  items: FeatureFlagItem[];
};

export const FEATURE_FLAG_SECTIONS: FeatureFlagSection[] = [
  {
    id: "infrastructure",
    title: "Infrastructure",
    items: [
      {
        id: "https",
        title: "HTTPS",
        description: "Force secure connections for admin and storefront.",
        icon: "🔒",
        defaultEnabled: true,
        statusNote:
          "Already enforced unconditionally by the hosting platform — this switch has no additional effect either way.",
      },
      {
        id: "maintenance",
        title: "Maintenance Mode",
        description: "Show maintenance page to visitors while updating.",
        icon: "🛠",
        defaultEnabled: false,
      },
      {
        id: "disable-encoding",
        title: "Disable image encoding",
        description: "Serve original uploads without re-encoding.",
        icon: "🖼",
        defaultEnabled: false,
        statusNote:
          "No upload re-encoding pipeline exists yet — this switch has no effect.",
      },
    ],
  },
  {
    id: "customer-checkout",
    title: "Customer & Checkout",
    items: [
      {
        id: "registration-verification",
        title: "Customer Registration Verification",
        description: "Require email verification before account activation.",
        icon: "✉",
        defaultEnabled: true,
        statusNote:
          "The verification send/check flow isn't built yet (new accounts activate immediately) — this switch has no effect.",
      },
      {
        id: "guest-checkout",
        title: "Guest Checkout",
        description: "Allow checkout without creating an account.",
        icon: "🛒",
        defaultEnabled: true,
        statusNote:
          "Checkout currently always requires a signed-in account — there is no guest order flow yet for this switch to gate.",
      },
      {
        id: "pickup-point",
        title: "Pickup point",
        description: "Let customers collect orders from pickup locations.",
        icon: "📍",
        defaultEnabled: true,
      },
      {
        id: "billing-address",
        title: "Billing Address",
        description: "Collect billing address during checkout.",
        icon: "🏠",
        defaultEnabled: true,
      },
      {
        id: "last-viewed",
        title: "Last Viewed Products",
        description: "Show recently viewed products on storefront.",
        icon: "👁",
        defaultEnabled: true,
        statusNote:
          "No view-history tracking exists yet — this switch has no effect.",
      },
      {
        id: "product-query",
        title: "Product Query Q&A",
        description: "Allow customers to ask questions on product pages.",
        icon: "❓",
        defaultEnabled: false,
      },
      {
        id: "floating-actions",
        title: "Floating Action Buttons",
        description: "Quick contact and chat shortcuts on mobile.",
        icon: "💬",
        defaultEnabled: true,
        statusNote:
          "Superseded by the per-channel Enable switch in Settings → Chat Widgets, which already controls this.",
      },
    ],
  },
  {
    id: "promotions",
    title: "Promotions & Loyalty",
    items: [
      {
        id: "coupons",
        title: "Coupon System",
        description: "Enable discount codes at checkout.",
        icon: "🎟",
        defaultEnabled: true,
      },
      {
        id: "newsletter",
        title: "Newsletter",
        description: "Email subscription form and campaigns.",
        icon: "📰",
        defaultEnabled: false,
        statusNote:
          "Superseded by the Newsletter signup switch in Design Studio → Footer Widgets, which already controls this.",
      },
      {
        id: "wallet",
        title: "Wallet",
        description: "Store credit and wallet balance for customers.",
        icon: "👛",
        defaultEnabled: false,
        statusNote:
          "No customer-facing wallet or store-credit system exists yet — this switch has no effect.",
      },
    ],
  },
  {
    id: "security",
    title: "Security & Authentication",
    items: [
      {
        id: "email-verification",
        title: "Email Verification",
        description: "Verify email addresses on registration.",
        icon: "✅",
        defaultEnabled: true,
        statusNote:
          "The verification send/check flow isn't built yet — this switch has no effect.",
      },
      {
        id: "facebook-login",
        title: "Facebook login",
        description: "Sign in with Facebook OAuth.",
        icon: "f",
        defaultEnabled: false,
        oauthHint: true,
      },
      {
        id: "google-login",
        title: "Google login",
        description: "Sign in with Google OAuth.",
        icon: "G",
        defaultEnabled: false,
        oauthHint: true,
      },
      {
        id: "twitter-login",
        title: "Twitter login",
        description: "Sign in with Twitter OAuth.",
        icon: "𝕏",
        defaultEnabled: false,
        oauthHint: true,
      },
      {
        id: "apple-login",
        title: "Apple login",
        description: "Sign in with Apple OAuth.",
        icon: "",
        defaultEnabled: false,
        oauthHint: true,
      },
    ],
  },
];

export const FEATURE_FLAG_IDS: string[] = FEATURE_FLAG_SECTIONS.flatMap(
  (section) => section.items.map((item) => item.id),
);

export const FEATURE_FLAG_DEFAULTS: Record<string, boolean> =
  Object.fromEntries(
    FEATURE_FLAG_SECTIONS.flatMap((section) =>
      section.items.map((item) => [item.id, item.defaultEnabled]),
    ),
  );

export type BusinessSettings = {
  storeName: string;
  legalName: string;
  supportEmail: string;
  phone: string;
  address: string;
  city: string;
  timezone: string;
  taxId: string;
};

export type FeatureFlag = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  locked?: boolean;
};

export type LanguageOption = {
  code: string;
  label: string;
  enabled: boolean;
  isDefault: boolean;
  rtl?: boolean;
};

export type CurrencySettings = {
  code: string;
  symbol: string;
  decimalPlaces: number;
  symbolPosition: "before" | "after";
};

export type SocialIntegration = {
  id: string;
  label: string;
  enabled: boolean;
  configured: boolean;
  hint: string;
};

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  storeName: "Techno House",
  legalName: "Techno House Ltd.",
  supportEmail: "support@techno-house.demo",
  phone: "+880 9612-000000",
  address: "12 Tech Park Road, Level 4",
  city: "Dhaka",
  timezone: "Asia/Dhaka",
  taxId: "BIN-000000000",
};

export const MOCK_FEATURE_FLAGS: readonly FeatureFlag[] = [
  {
    id: "pc-builder",
    label: "PC Builder",
    description: "Storefront configurator and compatibility checks.",
    enabled: true,
  },
  {
    id: "compare",
    label: "Product compare",
    description: "Side-by-side compare up to 4 SKUs.",
    enabled: true,
  },
  {
    id: "wishlist",
    label: "Wishlist",
    description: "Save products on customer accounts.",
    enabled: true,
  },
  {
    id: "b2b-wholesale",
    label: "B2B wholesale pricing",
    description: "Display-only wholesale box on PDP (mock).",
    enabled: true,
  },
  {
    id: "guest-checkout",
    label: "Guest checkout",
    description: "Allow checkout without account.",
    enabled: true,
  },
  {
    id: "coupons",
    label: "Coupon codes",
    description: "Cart coupon field (display-only discounts).",
    enabled: true,
  },
  {
    id: "blog",
    label: "Blog",
    description: "Content marketing module — Phase 15.",
    enabled: false,
    locked: true,
  },
  {
    id: "multi-currency",
    label: "Multi-currency",
    description: "Not in v1 — BDT only.",
    enabled: false,
    locked: true,
  },
];

export const MOCK_LANGUAGES: readonly LanguageOption[] = [
  { code: "en", label: "English", enabled: true, isDefault: true, rtl: false },
  { code: "bn", label: "Bangla", enabled: false, isDefault: false, rtl: false },
];

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  code: "BDT",
  symbol: "৳",
  decimalPlaces: 0,
  symbolPosition: "before",
};

export const MOCK_SOCIAL_INTEGRATIONS: readonly SocialIntegration[] = [
  {
    id: "facebook-login",
    label: "Facebook login",
    enabled: false,
    configured: false,
    hint: "OAuth app not configured.",
  },
  {
    id: "google-login",
    label: "Google login",
    enabled: false,
    configured: false,
    hint: "OAuth client ID required — Phase 11.",
  },
  {
    id: "facebook-page",
    label: "Facebook page URL",
    enabled: true,
    configured: true,
    hint: "https://facebook.com/techno-house.demo",
  },
  {
    id: "instagram",
    label: "Instagram profile",
    enabled: false,
    configured: false,
    hint: "Pending real social URLs (AD pending).",
  },
];

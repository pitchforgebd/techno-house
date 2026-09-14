export const RECAPTCHA_PAGES = [
  { id: "admin-login", label: "Admin Login", field: "pageAdminLogin" },
  { id: "customer-login", label: "Customer Login", field: "pageCustomerLogin" },
  {
    id: "customer-registration",
    label: "Customer Registration",
    field: "pageCustomerRegistration",
  },
  {
    id: "forgot-password",
    label: "Forgot Password",
    field: "pageForgotPassword",
  },
  { id: "contact-us", label: "Contact Us Form", field: "pageContactUs" },
] as const;

export type RecaptchaPageId = (typeof RECAPTCHA_PAGES)[number]["id"];

export const RECAPTCHA_SCORE_OPTIONS = [0.3, 0.5, 0.7] as const;
export type RecaptchaScore = (typeof RECAPTCHA_SCORE_OPTIONS)[number];

export const RECAPTCHA_SITE_KEY_MAX = 120;

export type AdminRecaptchaConfig = {
  isEnabled: boolean;
  siteKey: string;
  scoreThreshold: RecaptchaScore;
  pages: Record<RecaptchaPageId, boolean>;
  updatedAt: string | null;
};

function stripControlChars(raw: string): string {
  return raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeRecaptchaSiteKey(raw: string): string | null {
  const value = stripControlChars(raw);
  if (value.length > RECAPTCHA_SITE_KEY_MAX) {
    return null;
  }
  return value;
}

export function normalizeRecaptchaScore(
  raw: string | number,
): RecaptchaScore | null {
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  if (n === 0.3 || n === 0.5 || n === 0.7) {
    return n;
  }
  return null;
}

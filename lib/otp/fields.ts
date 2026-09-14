export const OTP_PROVIDERS = [
  { value: "local-mock", label: "Local mock" },
  { value: "ssl-wireless", label: "SSL Wireless" },
  { value: "mim-sms", label: "Mim SMS" },
  { value: "twilio", label: "Twilio" },
  { value: "messagebird", label: "MessageBird" },
] as const;

export type OtpProviderId = (typeof OTP_PROVIDERS)[number]["value"];

export const OTP_LENGTH_OPTIONS = [4, 6] as const;
export type OtpLength = (typeof OTP_LENGTH_OPTIONS)[number];

export const SENDER_ID_MAX = 32;
export const EXPIRY_MINUTES_MIN = 1;
export const EXPIRY_MINUTES_MAX = 30;

export const DEFAULT_OTP_PROVIDER: OtpProviderId = "local-mock";
export const DEFAULT_OTP_LENGTH: OtpLength = 6;
export const DEFAULT_EXPIRY_MINUTES = 5;

export type AdminOtpConfig = {
  provider: OtpProviderId;
  senderId: string;
  otpLength: OtpLength;
  expiryMinutes: number;
  otpLogin: boolean;
  otpRegistration: boolean;
  updatedAt: string | null;
};

const PROVIDER_SET = new Set<string>(OTP_PROVIDERS.map((p) => p.value));

function stripControlChars(raw: string): string {
  return raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeOtpProvider(raw: string): OtpProviderId | null {
  const value = raw.trim().toLowerCase();
  if (!PROVIDER_SET.has(value)) {
    return null;
  }
  return value as OtpProviderId;
}

export function normalizeSenderId(raw: string): string | null {
  const value = stripControlChars(raw);
  if (value.length > SENDER_ID_MAX) {
    return null;
  }
  return value;
}

export function normalizeOtpLength(raw: string | number): OtpLength | null {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (n === 4 || n === 6) {
    return n;
  }
  return null;
}

export function normalizeExpiryMinutes(raw: string | number): number | null {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (
    !Number.isInteger(n) ||
    n < EXPIRY_MINUTES_MIN ||
    n > EXPIRY_MINUTES_MAX
  ) {
    return null;
  }
  return n;
}

export const SMTP_MAILER_TYPES = [
  { value: "smtp", label: "SMTP" },
  { value: "sendmail", label: "Sendmail" },
] as const;

export type SmtpMailerType = (typeof SMTP_MAILER_TYPES)[number]["value"];

export const SMTP_ENCRYPTION_OPTIONS = [
  { value: "tls", label: "TLS" },
  { value: "ssl", label: "SSL" },
  { value: "none", label: "None" },
] as const;

export type SmtpEncryption = (typeof SMTP_ENCRYPTION_OPTIONS)[number]["value"];

export const SMTP_HOST_MAX = 253;
export const SMTP_USERNAME_MAX = 120;
export const SMTP_FROM_NAME_MAX = 80;
export const SMTP_PORT_MIN = 1;
export const SMTP_PORT_MAX = 65535;

export const DEFAULT_SMTP_MAILER: SmtpMailerType = "smtp";
export const DEFAULT_SMTP_ENCRYPTION: SmtpEncryption = "tls";
export const DEFAULT_SMTP_PORT = 587;

export type AdminSmtpConfig = {
  mailerType: SmtpMailerType;
  host: string;
  port: number;
  username: string;
  encryption: SmtpEncryption;
  fromAddress: string;
  fromName: string;
  updatedAt: string | null;
};

const MAILER_SET = new Set<string>(SMTP_MAILER_TYPES.map((m) => m.value));
const ENCRYPTION_SET = new Set<string>(
  SMTP_ENCRYPTION_OPTIONS.map((e) => e.value),
);

function stripControlChars(raw: string): string {
  return raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeMailerType(raw: string): SmtpMailerType | null {
  const value = raw.trim().toLowerCase();
  if (!MAILER_SET.has(value)) {
    return null;
  }
  return value as SmtpMailerType;
}

export function normalizeEncryption(raw: string): SmtpEncryption | null {
  const value = raw.trim().toLowerCase();
  if (!ENCRYPTION_SET.has(value)) {
    return null;
  }
  return value as SmtpEncryption;
}

/**
 * Hostnames and literals that resolve to the machine itself or to a private
 * network. Rejected so the SMTP host cannot be pointed at internal
 * infrastructure and the "send test" button used as a blind port prober
 * (DSA-13).
 *
 * This is a best-effort textual guard, not a substitute for egress control: a
 * public DNS name that resolves to a private address still gets through, and
 * catching that requires resolving at connect time. It raises the bar against
 * the obvious cases, which is what an admin-tier setting warrants.
 */
const BLOCKED_SMTP_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

function isBlockedSmtpHost(host: string): boolean {
  const value = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!value) {
    return false;
  }
  if (BLOCKED_SMTP_HOSTS.has(value)) {
    return true;
  }
  // Anything under .local / .internal / .localdomain.
  if (/\.(local|internal|localdomain)$/.test(value)) {
    return true;
  }
  // IPv6 loopback and unique-local / link-local ranges.
  if (value === "::1" || /^(fc|fd|fe80)/.test(value)) {
    return true;
  }
  // IPv4 literals in loopback, private and link-local ranges, including the
  // cloud metadata address.
  const v4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127 || a === 0 || a === 10) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
  }
  return false;
}

export function normalizeSmtpHost(raw: string): string | null {
  const value = stripControlChars(raw);
  if (value.length > SMTP_HOST_MAX) {
    return null;
  }
  if (isBlockedSmtpHost(value)) {
    return null;
  }
  return value;
}

export function normalizeSmtpPort(raw: string | number): number | null {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isInteger(n) || n < SMTP_PORT_MIN || n > SMTP_PORT_MAX) {
    return null;
  }
  return n;
}

export function normalizeSmtpUsername(raw: string): string | null {
  const value = stripControlChars(raw);
  if (value.length > SMTP_USERNAME_MAX) {
    return null;
  }
  return value;
}

export function normalizeFromName(raw: string): string | null {
  const value = stripControlChars(raw);
  if (value.length > SMTP_FROM_NAME_MAX) {
    return null;
  }
  return value;
}

/** Empty allowed; otherwise a simple local@domain shape (no angle brackets). */
export function normalizeFromAddress(raw: string): string | null {
  const value = stripControlChars(raw).toLowerCase();
  if (!value) {
    return "";
  }
  if (value.length > 254) {
    return null;
  }
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
    return null;
  }
  return value;
}

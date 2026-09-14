export const CHAT_WIDGET_PROVIDERS = [
  {
    id: "WHATSAPP",
    title: "WhatsApp",
    handleLabel: "Phone number",
    handleHint: "Digits with optional leading + (e.g. +8801XXXXXXXXX)",
  },
  {
    id: "MESSENGER",
    title: "Facebook Messenger",
    handleLabel: "Page ID",
    handleHint: "Public Facebook Page id only — no scripts",
  },
  {
    id: "TAWKTO",
    title: "Tawk.to",
    handleLabel: "Property ID / Widget ID",
    handleHint:
      "From your Tawk.to embed URL: embed.tawk.to/<property id>/<widget id>",
  },
] as const;

export type ChatWidgetProviderId = (typeof CHAT_WIDGET_PROVIDERS)[number]["id"];

export const CHAT_HANDLE_MAX = 64;

export type AdminChatWidgetConfig = {
  provider: ChatWidgetProviderId;
  isEnabled: boolean;
  publicHandle: string;
  updatedAt: string | null;
};

const PROVIDER_SET = new Set<string>(CHAT_WIDGET_PROVIDERS.map((p) => p.id));

export function normalizeChatProvider(
  raw: string,
): ChatWidgetProviderId | null {
  const value = raw.trim().toUpperCase();
  if (!PROVIDER_SET.has(value)) {
    return null;
  }
  return value as ChatWidgetProviderId;
}

/**
 * WhatsApp: optional + then digits. Messenger: alphanumeric / hyphen.
 * Tawk.to: `<property id>/<widget id>`, each alphanumeric — matches the
 * path segments of Tawk's own embed.tawk.to/<property>/<widget> URL.
 */
export function normalizeChatHandle(
  provider: ChatWidgetProviderId,
  raw: string,
): string | null {
  const value = raw.replace(/\s+/g, "").trim();
  if (!value) {
    return "";
  }
  if (value.length > CHAT_HANDLE_MAX) {
    return null;
  }
  if (provider === "WHATSAPP") {
    if (!/^\+?[0-9]{8,15}$/.test(value)) {
      return null;
    }
    return value;
  }
  if (provider === "TAWKTO") {
    if (!/^[A-Za-z0-9]{8,32}\/[A-Za-z0-9]{4,20}$/.test(value)) {
      return null;
    }
    return value;
  }
  if (!/^[A-Za-z0-9._-]{2,32}$/.test(value)) {
    return null;
  }
  return value;
}

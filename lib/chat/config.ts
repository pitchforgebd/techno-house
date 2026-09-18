/**
 * Chat widget settings (P16-T06).
 *
 * Persists enable + public handle per provider. Tawk.to (AD-249) and
 * WhatsApp (AD-250) render real storefront UI when enabled — see
 * components/chat/storefront-chat-widget.tsx. Messenger stays intent-only.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import type { ChatWidgetProvider as DbProvider } from "@/lib/generated/prisma/enums";
import {
  CHAT_HANDLE_MAX,
  CHAT_WIDGET_PROVIDERS,
  normalizeChatHandle,
  normalizeChatProvider,
  type AdminChatWidgetConfig,
  type ChatWidgetProviderId,
} from "@/lib/chat/fields";

export type {
  AdminChatWidgetConfig,
  ChatWidgetProviderId,
} from "@/lib/chat/fields";

export const CHAT_DB_REQUIRED =
  "Chat widget changes need the database. Turn off DATA_SOURCE=mock to save.";

export type ChatMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type ChatActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): ChatMutationResult {
  return { ok: false, formError };
}

function emptyProvider(provider: ChatWidgetProviderId): AdminChatWidgetConfig {
  return {
    provider,
    isEnabled: false,
    publicHandle: "",
    updatedAt: null,
  };
}

export async function getAdminChatWidgetConfigs(): Promise<
  AdminChatWidgetConfig[]
> {
  if (!usesDatabase()) {
    return CHAT_WIDGET_PROVIDERS.map((p) => emptyProvider(p.id));
  }
  const rows = await getPrisma().chatWidgetConfiguration.findMany({
    select: {
      provider: true,
      isEnabled: true,
      publicHandle: true,
      updatedAt: true,
    },
  });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  return CHAT_WIDGET_PROVIDERS.map((meta) => {
    const row = byProvider.get(meta.id as DbProvider);
    if (!row) {
      return emptyProvider(meta.id);
    }
    return {
      provider: meta.id,
      isEnabled: row.isEnabled,
      publicHandle: row.publicHandle ?? "",
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export type StorefrontChatWidgetTag = {
  tawkPropertyId: string | null;
  tawkWidgetId: string | null;
  /** Digits only, wa.me-ready (e.g. "8801XXXXXXXXX"). */
  whatsappNumber: string | null;
  /** Public Facebook Page id/username, m.me-ready. */
  messengerPageId: string | null;
};

/** BD-friendly: local "01..." becomes "8801...". Already-international stays. */
function toWhatsAppDigits(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) {
    return null;
  }
  if (digits.startsWith("880")) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `880${digits.slice(1)}`;
  }
  return digits;
}

/** Public-safe projection for the storefront — enabled providers only. */
export async function getStorefrontChatWidgetTag(): Promise<StorefrontChatWidgetTag> {
  if (!usesDatabase()) {
    return {
      tawkPropertyId: null,
      tawkWidgetId: null,
      whatsappNumber: null,
      messengerPageId: null,
    };
  }
  const rows = await getPrisma().chatWidgetConfiguration.findMany({
    where: { provider: { in: ["TAWKTO", "WHATSAPP", "MESSENGER"] }, isEnabled: true },
    select: { provider: true, publicHandle: true },
  });

  let tawkPropertyId: string | null = null;
  let tawkWidgetId: string | null = null;
  let whatsappNumber: string | null = null;
  let messengerPageId: string | null = null;

  for (const row of rows) {
    if (row.provider === "TAWKTO" && row.publicHandle) {
      const [propertyId, widgetId] = row.publicHandle.split("/");
      if (propertyId && widgetId) {
        tawkPropertyId = propertyId;
        tawkWidgetId = widgetId;
      }
    }
    if (row.provider === "WHATSAPP" && row.publicHandle) {
      whatsappNumber = toWhatsAppDigits(row.publicHandle);
    }
    if (row.provider === "MESSENGER" && row.publicHandle) {
      messengerPageId = row.publicHandle;
    }
  }

  return { tawkPropertyId, tawkWidgetId, whatsappNumber, messengerPageId };
}

export async function saveChatWidgetConfig(input: {
  provider: string;
  isEnabled: boolean;
  publicHandle: string;
  actor?: ChatActor;
}): Promise<ChatMutationResult> {
  if (!usesDatabase()) {
    return fail(CHAT_DB_REQUIRED);
  }
  const provider = normalizeChatProvider(input.provider);
  if (provider == null) {
    return fail("Choose a supported chat provider.");
  }
  const publicHandle = normalizeChatHandle(provider, input.publicHandle);
  if (publicHandle == null) {
    const meta = CHAT_WIDGET_PROVIDERS.find((p) => p.id === provider);
    return fail(
      `Enter a valid ${meta?.handleLabel ?? "value"} (${CHAT_HANDLE_MAX} chars max)` +
        (meta ? ` — ${meta.handleHint}` : "") +
        ", or leave blank.",
    );
  }

  const row = await getPrisma().chatWidgetConfiguration.upsert({
    where: { provider: provider as DbProvider },
    create: {
      provider: provider as DbProvider,
      isEnabled: Boolean(input.isEnabled),
      publicHandle: publicHandle || null,
    },
    update: {
      isEnabled: Boolean(input.isEnabled),
      publicHandle: publicHandle || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.CHAT_WIDGET_UPDATE,
      entityType: "ChatWidgetConfiguration",
      entityId: row.id,
      metadata: {
        provider,
        isEnabled: Boolean(input.isEnabled),
        hasHandle: Boolean(publicHandle),
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}

/**
 * Currency display format (Admin → Settings → Currency).
 *
 * BDT is the only enabled currency in v1 (AD-006) — this only persists the
 * decimal-places/symbol-position *preference*. It does not feed
 * lib/format/currency.ts's formatMoney(), which is called synchronously
 * from dozens of client components across the app; wiring it live would
 * mean threading these settings through every call site, a much larger
 * change than this settings page. Treat this as saved preference only
 * until that wiring is explicitly requested.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export type CurrencySymbolPosition = "before" | "after";

export type AdminCurrencyFormat = {
  decimalPlaces: number;
  symbolPosition: CurrencySymbolPosition;
  updatedAt: string | null;
};

export type CurrencyFormatMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type CurrencyFormatActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const DEFAULT_FORMAT: AdminCurrencyFormat = {
  decimalPlaces: 0,
  symbolPosition: "before",
  updatedAt: null,
};

const DECIMAL_PLACES_MIN = 0;
const DECIMAL_PLACES_MAX = 4;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function normalizeSymbolPosition(raw: string): CurrencySymbolPosition | null {
  return raw === "before" || raw === "after" ? raw : null;
}

export async function getCurrencyFormat(): Promise<AdminCurrencyFormat> {
  if (!usesDatabase()) {
    return DEFAULT_FORMAT;
  }
  const row = await getPrisma().siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      currencyDecimalPlaces: true,
      currencySymbolPosition: true,
      updatedAt: true,
    },
  });
  if (!row) {
    return DEFAULT_FORMAT;
  }
  return {
    decimalPlaces: row.currencyDecimalPlaces,
    symbolPosition:
      normalizeSymbolPosition(row.currencySymbolPosition) ?? "before",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveCurrencyFormat(input: {
  decimalPlaces: string;
  symbolPosition: string;
  actor: CurrencyFormatActor;
}): Promise<CurrencyFormatMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Currency settings need the database." };
  }
  const decimalPlaces = Number.parseInt(input.decimalPlaces, 10);
  if (
    !Number.isInteger(decimalPlaces) ||
    decimalPlaces < DECIMAL_PLACES_MIN ||
    decimalPlaces > DECIMAL_PLACES_MAX
  ) {
    return {
      ok: false,
      formError: `Decimal places must be between ${DECIMAL_PLACES_MIN} and ${DECIMAL_PLACES_MAX}.`,
    };
  }
  const symbolPosition = normalizeSymbolPosition(input.symbolPosition);
  if (!symbolPosition) {
    return { ok: false, formError: "Choose a valid symbol position." };
  }

  const row = await getPrisma().siteSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      storeName: "Techno House",
      currencyDecimalPlaces: decimalPlaces,
      currencySymbolPosition: symbolPosition,
    },
    update: {
      currencyDecimalPlaces: decimalPlaces,
      currencySymbolPosition: symbolPosition,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.BUSINESS_SETTINGS_UPDATE,
    entityType: "SiteSettings",
    entityId: row.id,
    metadata: { currencyFormat: true, decimalPlaces, symbolPosition },
    ip: input.actor.ip,
  });
  return { ok: true };
}

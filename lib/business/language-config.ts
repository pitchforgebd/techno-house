/**
 * Storefront locale list (Admin → Settings → Languages).
 *
 * No i18n runtime exists (no translation storage, no locale routing) — this
 * persists which locales are enabled/default, not live translated content.
 * The default language's `rtl` flag IS real and live: app/layout.tsx reads
 * it to set the real `dir` attribute on `<html>` site-wide (Phase 10).
 * "Add language" / "Import translations" stay unimplemented since there is
 * nowhere for translated strings to live yet.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export type AdminLanguageRow = {
  code: string;
  label: string;
  enabled: boolean;
  isDefault: boolean;
  rtl: boolean;
};

export type LanguageMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type LanguageActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const DEFAULT_LANGUAGES: AdminLanguageRow[] = [
  { code: "en", label: "English", enabled: true, isDefault: true, rtl: false },
  { code: "bn", label: "Bangla", enabled: false, isDefault: false, rtl: false },
];

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function getLanguageSettings(): Promise<AdminLanguageRow[]> {
  if (!usesDatabase()) {
    return DEFAULT_LANGUAGES;
  }
  const rows = await getPrisma().languageSetting.findMany({
    orderBy: { code: "asc" },
  });
  if (rows.length === 0) {
    return DEFAULT_LANGUAGES;
  }
  return rows.map((row) => ({
    code: row.code,
    label: row.label,
    enabled: row.enabled,
    isDefault: row.isDefault,
    rtl: row.rtl,
  }));
}

export async function saveLanguageSettings(input: {
  defaultCode: string;
  languages: { code: string; enabled: boolean; rtl: boolean }[];
  actor: LanguageActor;
}): Promise<LanguageMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Language settings need the database." };
  }
  const defaultCode = input.defaultCode.trim();
  const known = new Map(DEFAULT_LANGUAGES.map((l) => [l.code, l.label]));
  const rows = input.languages.filter((l) => known.has(l.code));
  if (rows.length === 0) {
    return { ok: false, formError: "No valid languages to save." };
  }
  if (!rows.some((l) => l.code === defaultCode)) {
    return { ok: false, formError: "Choose a valid default language." };
  }
  const defaultRow = rows.find((l) => l.code === defaultCode);
  if (defaultRow && !defaultRow.enabled) {
    return { ok: false, formError: "The default language must be enabled." };
  }

  const prisma = getPrisma();
  await prisma.$transaction(
    rows.map((row) =>
      prisma.languageSetting.upsert({
        where: { code: row.code },
        create: {
          code: row.code,
          label: known.get(row.code) ?? row.code,
          enabled: row.code === defaultCode ? true : row.enabled,
          isDefault: row.code === defaultCode,
          rtl: row.rtl,
        },
        update: {
          enabled: row.code === defaultCode ? true : row.enabled,
          isDefault: row.code === defaultCode,
          rtl: row.rtl,
        },
      }),
    ),
  );

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.BUSINESS_SETTINGS_UPDATE,
    entityType: "LanguageSetting",
    entityId: defaultCode,
    metadata: { defaultCode, languages: rows },
    ip: input.actor.ip,
  });
  return { ok: true };
}

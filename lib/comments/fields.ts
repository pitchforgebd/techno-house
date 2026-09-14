export const COMMENT_PROVIDERS = [
  { value: "facebook", label: "Facebook Comments" },
  { value: "none", label: "None" },
] as const;

export type CommentProviderId = (typeof COMMENT_PROVIDERS)[number]["value"];

export const COMMENT_APP_ID_MAX = 64;

export type AdminCommentSystemConfig = {
  isEnabled: boolean;
  provider: CommentProviderId;
  publicAppId: string;
  updatedAt: string | null;
};

const PROVIDER_SET = new Set<string>(COMMENT_PROVIDERS.map((p) => p.value));

function stripControlChars(raw: string): string {
  return raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeCommentProvider(
  raw: string,
): CommentProviderId | null {
  const value = raw.trim().toLowerCase();
  if (!PROVIDER_SET.has(value)) {
    return null;
  }
  return value as CommentProviderId;
}

export function normalizeCommentAppId(raw: string): string | null {
  const value = stripControlChars(raw);
  if (!value) {
    return "";
  }
  if (value.length > COMMENT_APP_ID_MAX) {
    return null;
  }
  if (!/^[0-9A-Za-z._-]{2,64}$/.test(value)) {
    return null;
  }
  return value;
}

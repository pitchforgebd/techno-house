import { BUILDER_SLOTS } from "@/lib/domain/pc-builder/slots";
import {
  countFilledSlots,
  normalizeBuildSelection,
} from "@/lib/domain/pc-builder/selection";
import type { BuildSelection } from "@/lib/domain/pc-builder/types";

const MAX_SHARE_JSON_CHARS = 1800;
const MAX_SHARE_ID_CHARS = 2400;

function bytesToBase64Url(bytes: Uint8Array): string {
  let base64: string;
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function fromBase64Url(id: string): string {
  const padded = id.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf8");
  }
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes selection as a guest share id (public product slugs only — no PII).
 */
export function encodeShareId(selection: BuildSelection): string | null {
  if (countFilledSlots(selection).filled === 0) {
    return null;
  }
  const compact: Record<string, string> = {};
  for (const slot of BUILDER_SLOTS) {
    const slug = selection[slot.id];
    if (typeof slug === "string" && slug.length > 0) {
      compact[slot.id] = slug;
    }
  }
  const json = JSON.stringify(compact);
  if (json.length > MAX_SHARE_JSON_CHARS) {
    return null;
  }
  return toBase64Url(json);
}

export function decodeShareId(id: string): BuildSelection | null {
  const trimmed = id.trim();
  if (!trimmed || trimmed.length > MAX_SHARE_ID_CHARS) {
    return null;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return null;
  }
  try {
    const json = fromBase64Url(trimmed);
    const parsed = JSON.parse(json) as unknown;
    const selection = normalizeBuildSelection(parsed);
    if (countFilledSlots(selection).filled === 0) {
      return null;
    }
    return selection;
  } catch {
    return null;
  }
}

export const SHARE_SLUG_PREFIX = "thb_";
const SHARE_SLUG_PATTERN = /^thb_[A-Za-z0-9_-]{43}$/;

export function isPersistedShareSlug(value: string): boolean {
  return SHARE_SLUG_PATTERN.test(value.trim());
}

export function sharePathForSlug(slug: string): string {
  return `/pc-builder/share/${slug}`;
}

export function sharePathForSelection(
  selection: BuildSelection,
): string | null {
  const id = encodeShareId(selection);
  if (!id) {
    return null;
  }
  return sharePathForSlug(id);
}

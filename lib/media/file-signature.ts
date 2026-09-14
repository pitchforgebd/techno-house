/**
 * Content-based file type validation (DSA-11).
 *
 * Both upload paths accepted a file on the strength of its extension and the
 * browser-declared MIME type — two things the uploader controls completely.
 * This inspects the actual leading bytes instead, so a file has to *be* what it
 * claims to be.
 *
 * Deliberately a allowlist of signatures rather than a blocklist of dangerous
 * ones: a format nobody recognised is refused, not waved through.
 *
 * Note on SVG and PDF: neither has a fixed binary magic number — both are text
 * formats — so they are matched structurally instead. That is weaker than a
 * byte signature and is the reason the SVG serving headers still matter
 * independently (F-02).
 */

export type FileKind =
  | "jpeg"
  | "png"
  | "gif"
  | "webp"
  | "svg"
  | "pdf";

/** Bytes needed before a decision can be made. */
export const SIGNATURE_SAMPLE_BYTES = 512;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => bytes[index] === byte);
}

/** RIFF….WEBP — the marker sits at offset 8, after the RIFF size field. */
function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }
  const riff = startsWith(bytes, [0x52, 0x49, 0x46, 0x46]);
  const webp =
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return riff && webp;
}

/**
 * SVG is XML, so there is no magic number. Accept only a leading XML
 * declaration, comment, doctype or `<svg` element, after optional whitespace
 * and a BOM — enough to reject a binary or a stray HTML document renamed
 * `.svg`.
 */
function isSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, SIGNATURE_SAMPLE_BYTES))
    .replace(/^﻿/, "")
    .trimStart()
    .toLowerCase();
  if (!head.startsWith("<")) {
    return false;
  }
  return (
    head.startsWith("<svg") ||
    head.startsWith("<?xml") ||
    head.startsWith("<!doctype svg") ||
    head.startsWith("<!--")
  );
}

/** Detects the real type of a file from its leading bytes. */
export function detectFileKind(bytes: Uint8Array): FileKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "jpeg";
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "gif";
  }
  if (isWebp(bytes)) {
    return "webp";
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "pdf";
  }
  if (isSvg(bytes)) {
    return "svg";
  }
  return null;
}

/** File kinds an extension is allowed to carry. */
const EXTENSION_KINDS: Record<string, readonly FileKind[]> = {
  ".jpg": ["jpeg"],
  ".jpeg": ["jpeg"],
  ".png": ["png"],
  ".gif": ["gif"],
  ".webp": ["webp"],
  ".svg": ["svg"],
  ".pdf": ["pdf"],
};

export type SignatureCheck =
  | { ok: true; kind: FileKind }
  | { ok: false; reason: string };

/**
 * Confirms the bytes match the extension.
 *
 * `extension` must already have passed the caller's own allowlist — this only
 * answers "are the contents what this extension promises?", not "is this
 * extension allowed here?".
 */
export function verifyFileSignature(
  extension: string,
  bytes: Uint8Array,
): SignatureCheck {
  const allowed = EXTENSION_KINDS[extension.toLowerCase()];
  if (!allowed) {
    return { ok: false, reason: "Unsupported file type." };
  }
  const kind = detectFileKind(bytes);
  if (!kind) {
    return {
      ok: false,
      reason: "That file's contents are not a supported image or PDF.",
    };
  }
  if (!allowed.includes(kind)) {
    return {
      ok: false,
      reason: `That file is a ${kind.toUpperCase()} but is named ${extension}.`,
    };
  }
  return { ok: true, kind };
}

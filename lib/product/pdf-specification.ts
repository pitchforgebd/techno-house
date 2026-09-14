/**
 * PDF specification path helpers (safe for Client Components).
 */

const PDF_PATH_MAX = 500;

/**
 * Accepts a local public PDF path (`/uploads/…pdf`) or an http(s) PDF URL.
 * Empty → clear. Invalid → undefined (caller treats as form error).
 */
export function normalizePdfSpecificationSrc(
  raw: string | undefined,
): string | null | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = raw.trim();
  if (!value) {
    return null;
  }
  if (value.includes("..") || value.includes("\\")) {
    return undefined;
  }

  const lower = value.toLowerCase();

  if (value.startsWith("/") && !value.startsWith("//")) {
    if (!lower.endsWith(".pdf")) {
      return undefined;
    }
    return value.slice(0, PDF_PATH_MAX);
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }
    if (!url.hostname) {
      return undefined;
    }
    const path = url.pathname.toLowerCase();
    if (!path.endsWith(".pdf") && !lower.includes(".pdf")) {
      // Some CDNs omit .pdf in the path; still allow if Content-Type is unknown
      // but require .pdf somewhere in the URL for a light check.
      return undefined;
    }
    return value.slice(0, PDF_PATH_MAX);
  } catch {
    return undefined;
  }
}

export function pdfFilenameFromSrc(src: string): string {
  try {
    if (/^https?:\/\//i.test(src)) {
      const base = decodeURIComponent(
        new URL(src).pathname.split("/").filter(Boolean).pop() ?? "",
      );
      return base || "specification.pdf";
    }
  } catch {
    // fall through
  }
  const base = src.split("/").filter(Boolean).pop() ?? "";
  return base || "specification.pdf";
}

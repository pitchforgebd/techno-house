/**
 * YouTube URL helpers for product pages (safe to import in client code).
 */

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/** Extract an 11-character video id, or null if the URL is not a YouTube link. */
export function parseYoutubeVideoId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    return isYoutubeId(id) ? id : null;
  }

  const watchId = url.searchParams.get("v");
  if (watchId && isYoutubeId(watchId)) {
    return watchId;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const marker = parts.findIndex(
    (part) => part === "embed" || part === "shorts" || part === "live",
  );
  if (marker >= 0) {
    const id = parts[marker + 1] ?? "";
    return isYoutubeId(id) ? id : null;
  }

  return null;
}

function isYoutubeId(value: string): boolean {
  return /^[\w-]{11}$/.test(value);
}

/** Privacy-enhanced embed URL, or null when the input is not a usable YouTube link. */
export function youtubeEmbedUrl(raw: string): string | null {
  const id = parseYoutubeVideoId(raw);
  if (!id) {
    return null;
  }
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/** Normalize a staff-entered YouTube URL for storage, or null to clear. */
export function normalizeYoutubeUrl(
  raw: string,
): { ok: true; value: string | null } | { ok: false; formError: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  if (trimmed.length > 500) {
    return { ok: false, formError: "YouTube URL is too long." };
  }
  const id = parseYoutubeVideoId(trimmed);
  if (!id) {
    return {
      ok: false,
      formError:
        "Enter a valid YouTube video, Shorts, or youtu.be link.",
    };
  }
  return { ok: true, value: `https://www.youtube.com/watch?v=${id}` };
}

/**
 * Time-boxed fetch for courier API calls. Never log request bodies or
 * headers — they can contain API keys/tokens.
 */
const TIMEOUT_MS = 15_000;

export type CourierHttpResult =
  | { ok: true; status: number; text: string }
  | { ok: false; reason: string };

async function courierFetch(
  url: string,
  init: RequestInit,
): Promise<CourierHttpResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    return { ok: true, status: response.status, text };
  } catch {
    return { ok: false, reason: "The courier request timed out." };
  } finally {
    clearTimeout(timer);
  }
}

export async function courierGet(
  url: string,
  headers?: Record<string, string>,
): Promise<CourierHttpResult> {
  return courierFetch(url, { method: "GET", headers });
}

export async function courierPost(input: {
  url: string;
  headers?: Record<string, string>;
  body: string;
  contentType: string;
}): Promise<CourierHttpResult> {
  return courierFetch(input.url, {
    method: "POST",
    headers: { "Content-Type": input.contentType, ...input.headers },
    body: input.body,
  });
}

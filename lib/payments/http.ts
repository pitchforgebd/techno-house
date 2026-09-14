/**
 * Time-boxed fetch for gateway calls. Never log request bodies or headers —
 * they can contain store passwords, app secrets, or tokens.
 */
const TIMEOUT_MS = 15_000;

type GatewayHttpResult =
  { ok: true; text: string } | { ok: false; reason: string };

async function gatewayFetch(
  url: string,
  init: RequestInit,
): Promise<GatewayHttpResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) {
      return { ok: false, reason: "The payment gateway request failed." };
    }
    return { ok: true, text };
  } catch {
    return { ok: false, reason: "The payment gateway timed out." };
  } finally {
    clearTimeout(timer);
  }
}

export async function gatewayGet(
  url: string,
  headers?: Record<string, string>,
): Promise<GatewayHttpResult> {
  return gatewayFetch(url, {
    method: "GET",
    headers: { Accept: "application/json", ...headers },
  });
}

export async function gatewayPost(input: {
  url: string;
  headers?: Record<string, string>;
  body: string;
  contentType: string;
}): Promise<GatewayHttpResult> {
  return gatewayFetch(input.url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": input.contentType,
      ...input.headers,
    },
    body: input.body,
  });
}

/**
 * Read gateway callback fields. Values are not trusted as payment proof.
 */
export async function readCallbackFields(
  request: Request,
): Promise<Record<string, string>> {
  const fields: Record<string, string> = {};
  const url = new URL(request.url);
  for (const [key, value] of url.searchParams.entries()) {
    fields[key] = value;
  }

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body: unknown = await request.json();
      if (body && typeof body === "object" && !Array.isArray(body)) {
        for (const [key, value] of Object.entries(body)) {
          if (typeof value === "string" || typeof value === "number") {
            fields[key] = String(value);
          }
        }
      }
      return fields;
    }

    const text = await request.text();
    if (text) {
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        fields[key] = value;
      }
    }
  } catch {
    return fields;
  }
  return fields;
}

export type WebhookProcessResult = {
  acknowledged: boolean;
  paid: boolean;
  reason?: string;
};

/** Transient gateway failures retry (503). Invalid events do not. */
export function webhookResponse(result: WebhookProcessResult): {
  body: string;
  status: 200 | 503;
} {
  return result.acknowledged
    ? { body: "OK", status: 200 }
    : { body: "RETRY", status: 503 };
}

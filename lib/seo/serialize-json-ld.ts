/**
 * Body of a <script type="application/ld+json"> element.
 *
 * `JSON.stringify` alone is NOT safe there: it leaves "<" untouched, so a value
 * containing "</script>" (a product name or description typed by staff, or
 * pasted in from a bulk import) closes the script element and the rest becomes
 * live HTML on every page that emits it. Escaping "<" as a JSON unicode escape
 * keeps the payload identical for any JSON parser while making it impossible
 * to break out. U+2028 / U+2029 are escaped too: they are legal in JSON but
 * were line terminators in older JavaScript engines.
 */
export function serializeJsonLd(data: unknown): string {
  return (JSON.stringify(data) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

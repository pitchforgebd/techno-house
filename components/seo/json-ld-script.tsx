import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";

/**
 * Shared `<script type="application/ld+json">` renderer, so every page that
 * emits structured data serializes it the same way instead of each inlining
 * its own `dangerouslySetInnerHTML`. `data` is JSON-serializable only — no
 * user-controlled HTML ever belongs in a JSON-LD payload.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

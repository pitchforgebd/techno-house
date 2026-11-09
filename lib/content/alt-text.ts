/**
 * Junk image alt text (SEO phase 5). One rule shared by the storefront
 * fallback (`safeAlt`) and the report script (scripts/fix-catalog-text.mjs).
 *
 * Junk = empty; under 4 characters; nothing but punctuation; a phrase wrapped
 * in stray quotes (“Flash deal”.); or Latin letters with no vowel and no digit
 * (DGDH, CBBBCXBC, VBNM B). Text with non-Latin letters (Bangla) is never
 * called junk for lacking vowels, and a digit keeps a model code ("RTX 4060").
 */
export function isJunkAlt(alt: string | null | undefined): boolean {
  const text = (alt ?? "").trim();
  if ([...text].length < 4) {
    return true;
  }
  if (!/[\p{L}\p{N}]/u.test(text)) {
    return true;
  }
  if (/^[“”"'‘’«»]/u.test(text) && /[“”"'‘’«»][.,;:!?]*$/u.test(text)) {
    return true;
  }
  const letters = text.match(/\p{L}/gu) ?? [];
  const onlyLatin = letters.every((letter) => /[a-z]/i.test(letter));
  return onlyLatin && !/\d/.test(text) && !/[aeiouy]/i.test(text);
}

/** The stored alt when it is usable, else the first usable fallback. */
export function safeAlt(
  alt: string | null | undefined,
  ...fallbacks: (string | null | undefined)[]
): string {
  for (const candidate of [alt, ...fallbacks]) {
    if (!isJunkAlt(candidate)) {
      return candidate!.trim();
    }
  }
  return "";
}

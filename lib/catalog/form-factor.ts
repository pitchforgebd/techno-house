/**
 * Motherboard / PC case form factor from free text (SEO phase 8, v2.4). PURE, no lookbehind (bundled into the
 * admin form through lib/seo/product-seo.ts).
 *
 * Used by the SEO generator AND by scripts/deploy/populate-import-attributes.ts, so the two cannot disagree.
 * The old readers had two faults that put "ATX form factor" on Micro-ATX boards and cases:
 *   - an alternation ending in a bare `ATX` matched the tail of "M-ATX" / "mATX";
 *   - "Micro ATX" (a space) was not recognised as Micro-ATX at all.
 *
 *   Micro-ATX  M-ATX  mATX  M.ATX  M ATX  MicroATX  Micro ATX  Micro-ATX  uATX
 *   E-ATX      EATX   E ATX  Extended ATX
 *   Mini-ITX   Mini ITX  mITX  ITX
 *   ATX        only when the text says ATX WITHOUT an M / E / Micro / Mini / u prefix
 */
export type FormFactor = "ATX" | "Micro-ATX" | "E-ATX" | "Mini-ITX";

const MINI_ITX = /\b(?:mini[\s.-]?itx|m[\s.-]?itx|itx)\b/gi;
const E_ATX = /\b(?:e[\s.-]?atx|extended[\s.-]?atx)\b/gi;
const MICRO_ATX = /\b(?:micro[\s.-]?atx|m[\s.-]?atx|u[\s.-]?atx)\b/gi;
const PLAIN_ATX = /\batx\b/i;

/** Every distinct form factor the text mentions (a case that lists several supported boards returns several). */
export function formFactorsIn(text: string): FormFactor[] {
  const found: FormFactor[] = [];
  let rest = ` ${text} `;
  const take = (re: RegExp, value: FormFactor) => {
    re.lastIndex = 0;
    if (re.test(rest)) {
      found.push(value);
      re.lastIndex = 0;
      rest = rest.replace(re, " ");
    }
  };
  take(MINI_ITX, "Mini-ITX");
  take(E_ATX, "E-ATX");
  take(MICRO_ATX, "Micro-ATX");
  // What is left cannot be a prefixed form: a bare ATX is plain ATX.
  if (PLAIN_ATX.test(rest)) found.push("ATX");
  return found;
}

/** The form factor, or null when the text says none or says several (then nothing is claimed). */
export function formFactorOf(text: string): FormFactor | null {
  const all = formFactorsIn(text);
  return all.length === 1 ? (all[0] ?? null) : null;
}

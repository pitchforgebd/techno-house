/** Types for webp-variant.mjs (see that file for behaviour). */
import type Sharp from "sharp";
export type VariantRules = { kind: "banner" | "product"; maxWidth: number; targetBytes: number };

export type VariantResult = {
  file: string;
  variant: string | null;
  action: "write" | "skip";
  reason: string;
  before: number;
  after: number;
  quality: number | null;
  width: number | null;
};

export const RULES: {
  banner: { maxWidth: number; targetBytes: number };
  product: { maxWidth: number; targetBytes: number };
};

export function rulesFor(filePath: string): VariantRules;
export function variantPathFor(filePath: string): string | null;
export function isVariantFile(filePath: string): Promise<boolean>;
export function encodeWebp(
  sharp: typeof Sharp,
  input: string | Buffer,
  rules: { maxWidth: number; targetBytes: number },
): Promise<{ buffer: Buffer; quality: number; width: number; originalWidth: number }>;
export function processFile(
  sharp: typeof Sharp,
  filePath: string,
  options?: { apply?: boolean; force?: boolean },
): Promise<VariantResult>;
export function removeVariantOf(filePath: string): Promise<void>;

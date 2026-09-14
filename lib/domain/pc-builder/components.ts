import type { BuilderCandidate } from "@/lib/data/types/catalog";
import type { CompatibilityPart } from "@/lib/domain/pc-builder/compatibility";
import { selectedSlugs } from "@/lib/domain/pc-builder/selection";
import { BUILDER_SLOTS } from "@/lib/domain/pc-builder/slots";
import type { BuildSelection } from "@/lib/domain/pc-builder/types";

const MAX_BUILD_PRODUCTS = 24;

/**
 * Maps a persisted candidate onto the pure engine snapshot.
 * Slot comes from the build selection, not the product row, so a later
 * admin re-tag cannot move a chosen part into a different slot mid-build.
 */
export function candidateToCompatibilityPart(
  slotId: CompatibilityPart["slotId"],
  candidate: BuilderCandidate,
): CompatibilityPart {
  return {
    slotId,
    slug: candidate.slug,
    name: candidate.name,
    attrs: candidate.builderAttrs,
  };
}

export function compatibilityPartsFromCandidates(
  selection: BuildSelection,
  candidates: BuilderCandidate[],
): CompatibilityPart[] {
  const bySlug = new Map(
    candidates.map((candidate) => [candidate.slug, candidate]),
  );
  const parts: CompatibilityPart[] = [];

  for (const slot of BUILDER_SLOTS) {
    const slug = selection[slot.id];
    if (typeof slug !== "string" || !slug) {
      continue;
    }
    const candidate = bySlug.get(slug);
    if (!candidate) {
      continue;
    }
    parts.push(candidateToCompatibilityPart(slot.id, candidate));
    if (parts.length >= MAX_BUILD_PRODUCTS) {
      break;
    }
  }

  return parts;
}

export function buildCandidateSlugs(selection: BuildSelection): string[] {
  return selectedSlugs(selection).slice(0, MAX_BUILD_PRODUCTS);
}

import { normalizeBuildSelection } from "@/lib/domain/pc-builder/selection";
import {
  emptyBuildSelection,
  type BuildSelection,
} from "@/lib/domain/pc-builder/types";

export const BUILDER_SAVED_STORAGE_KEY = "techno-house-pc-builder-saved-v1";
export const MAX_SAVED_BUILDS = 12;
export const MAX_SAVED_BUILD_NAME = 48;

export type SavedBuild = {
  id: string;
  name: string;
  createdAt: string;
  selection: BuildSelection;
};

export function createSavedBuildId(): string {
  return `sb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSavedBuildName(raw: string): string {
  return raw.trim().slice(0, MAX_SAVED_BUILD_NAME);
}

export function normalizeSavedBuilds(raw: unknown): SavedBuild[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const builds: SavedBuild[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Partial<SavedBuild>;
    if (typeof row.id !== "string" || typeof row.name !== "string") {
      continue;
    }
    if (typeof row.createdAt !== "string") {
      continue;
    }
    const name = normalizeSavedBuildName(row.name);
    if (!name) {
      continue;
    }
    const selection = normalizeBuildSelection(row.selection);
    builds.push({
      id: row.id.slice(0, 64),
      name,
      createdAt: row.createdAt,
      selection,
    });
    if (builds.length >= MAX_SAVED_BUILDS) {
      break;
    }
  }
  return builds;
}

export function addSavedBuild(
  builds: SavedBuild[],
  name: string,
  selection: BuildSelection,
): SavedBuild[] {
  const trimmed = normalizeSavedBuildName(name);
  if (!trimmed) {
    return builds;
  }
  const next: SavedBuild = {
    id: createSavedBuildId(),
    name: trimmed,
    createdAt: new Date().toISOString(),
    selection: normalizeBuildSelection(selection) || emptyBuildSelection(),
  };
  return [next, ...builds].slice(0, MAX_SAVED_BUILDS);
}

export function removeSavedBuild(
  builds: SavedBuild[],
  id: string,
): SavedBuild[] {
  return builds.filter((build) => build.id !== id);
}

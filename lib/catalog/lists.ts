export const LISTS_STORAGE_KEY = "techno-house-lists-v1";
export const MAX_COMPARE = 4;
export const MAX_WISHLIST = 48;

export type CompareEntry = {
  slug: string;
  categorySlug: string;
};

export type ListsState = {
  wishlist: string[];
  compare: CompareEntry[];
};

export const EMPTY_LISTS: ListsState = {
  wishlist: [],
  compare: [],
};

export type CompareAddResult =
  | { ok: true; state: ListsState }
  | { ok: false; reason: string; state: ListsState };

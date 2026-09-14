/**
 * Signed-in saved PC builds (P14-T04 / T05).
 *
 * Rows live on `PCBuild` / `PCBuildItem`. Guests and `DATA_SOURCE=mock`
 * stay on device-local storage. Share slugs are minted in
 * `lib/pc-builder/share.ts`.
 */
import { getCustomerSession } from "@/lib/auth/customer-session";
import { productRepository } from "@/lib/data";
import { toDbBuilderSlot, toBuilderSlot } from "@/lib/data/prisma/mappers";
import {
  BUILDER_SLOTS,
  MAX_SAVED_BUILDS,
  countFilledSlots,
  normalizeBuildSelection,
  normalizeSavedBuildName,
  type BuildSelection,
  type SavedBuild,
} from "@/lib/domain/pc-builder";
import { getPrisma } from "@/lib/db/prisma";
import type { BuilderSlot as DbBuilderSlot } from "@/lib/generated/prisma/enums";

export const BUILDS_DB_REQUIRED =
  "Saved builds need the database. Turn off DATA_SOURCE=mock to save to your account.";

export const BUILDS_SIGN_IN = "Sign in to save this build to your account.";

export type SavedBuildMutationResult =
  | { ok: true; builds: SavedBuild[]; persisted: boolean }
  | { ok: false; formError: string; persisted: boolean };

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string, persisted: boolean): SavedBuildMutationResult {
  return { ok: false, formError, persisted };
}

function ok(
  builds: SavedBuild[],
  persisted: boolean,
): SavedBuildMutationResult {
  return { ok: true, builds, persisted };
}

export type PreparedBuildItems =
  | {
      ok: true;
      items: Array<{
        slot: ReturnType<typeof toDbBuilderSlot>;
        productId: string;
        quantity: number;
      }>;
      totalAmount: number;
    }
  | { ok: false; formError: string };

export function selectionFromBuildItems(
  items: Array<{ slot: DbBuilderSlot; product: { slug: string } }>,
): BuildSelection {
  const selection: BuildSelection = {};
  for (const item of items) {
    selection[toBuilderSlot(item.slot)] = item.product.slug;
  }
  return normalizeBuildSelection(selection);
}

function toSavedBuild(row: {
  id: string;
  name: string;
  createdAt: Date;
  shareSlug?: string | null;
  items: Array<{ slot: DbBuilderSlot; product: { slug: string } }>;
}): SavedBuild {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    selection: selectionFromBuildItems(row.items),
    shareSlug: row.shareSlug ?? null,
  };
}

export async function prepareBuildItems(
  raw: BuildSelection,
  emptyMessage = "Select at least one part.",
): Promise<PreparedBuildItems> {
  const selection = normalizeBuildSelection(raw);
  if (countFilledSlots(selection).filled === 0) {
    return { ok: false, formError: emptyMessage };
  }

  const slugs = BUILDER_SLOTS.map((slot) => selection[slot.id]).filter(
    (slug): slug is string => typeof slug === "string" && slug.length > 0,
  );
  const candidates =
    await productRepository.listBuilderCandidatesBySlugs(slugs);
  const bySlug = new Map(candidates.map((item) => [item.slug, item]));

  const items: Array<{
    slot: ReturnType<typeof toDbBuilderSlot>;
    productId: string;
    quantity: number;
  }> = [];
  let totalAmount = 0;

  for (const slot of BUILDER_SLOTS) {
    const slug = selection[slot.id];
    if (typeof slug !== "string" || !slug) {
      continue;
    }
    const product = bySlug.get(slug);
    if (!product) {
      return {
        ok: false,
        formError: "A selected part is no longer available.",
      };
    }
    if (product.builderSlot && product.builderSlot !== slot.id) {
      return {
        ok: false,
        formError: `${product.name} does not belong in the ${slot.label} slot.`,
      };
    }
    items.push({
      slot: toDbBuilderSlot(slot.id),
      productId: product.id,
      quantity: 1,
    });
    totalAmount += product.price.amount;
  }

  return { ok: true, items, totalAmount };
}

export async function listUserBuilds(userId: string): Promise<SavedBuild[]> {
  const rows = await getPrisma().pCBuild.findMany({
    where: { userId, status: "SAVED" },
    orderBy: { createdAt: "desc" },
    take: MAX_SAVED_BUILDS,
    select: {
      id: true,
      name: true,
      createdAt: true,
      shareSlug: true,
      items: {
        select: {
          slot: true,
          product: { select: { slug: true } },
        },
      },
    },
  });
  return rows.map(toSavedBuild);
}

async function pruneExtraBuilds(userId: string): Promise<void> {
  const extras = await getPrisma().pCBuild.findMany({
    where: { userId, status: "SAVED" },
    orderBy: { createdAt: "desc" },
    skip: MAX_SAVED_BUILDS,
    select: { id: true },
  });
  if (extras.length === 0) {
    return;
  }
  await getPrisma().pCBuild.deleteMany({
    where: { id: { in: extras.map((row) => row.id) } },
  });
}

export async function listSavedBuilds(): Promise<SavedBuildMutationResult> {
  if (!usesDatabase()) {
    return ok([], false);
  }
  const session = await getCustomerSession();
  if (!session) {
    return ok([], false);
  }
  return ok(await listUserBuilds(session.userId), true);
}

export async function saveSavedBuild(input: {
  name: string;
  selection: BuildSelection;
}): Promise<SavedBuildMutationResult> {
  if (!usesDatabase()) {
    return fail(BUILDS_DB_REQUIRED, false);
  }
  const session = await getCustomerSession();
  if (!session) {
    return fail(BUILDS_SIGN_IN, false);
  }

  const name = normalizeSavedBuildName(input.name);
  if (!name) {
    return fail("Enter a short name for this build.", true);
  }

  const prepared = await prepareBuildItems(
    input.selection,
    "Select at least one part before saving.",
  );
  if (!prepared.ok) {
    return fail(prepared.formError, true);
  }
  const { items, totalAmount } = prepared;

  await getPrisma().pCBuild.create({
    data: {
      userId: session.userId,
      name,
      status: "SAVED",
      totalAmount,
      items: { create: items },
    },
  });
  await pruneExtraBuilds(session.userId);
  return ok(await listUserBuilds(session.userId), true);
}

export async function deleteSavedBuild(
  id: string,
): Promise<SavedBuildMutationResult> {
  if (!usesDatabase()) {
    return fail(BUILDS_DB_REQUIRED, false);
  }
  const session = await getCustomerSession();
  if (!session) {
    return fail(BUILDS_SIGN_IN, false);
  }

  const trimmed = id.trim();
  if (!trimmed) {
    return fail("That build no longer exists.", true);
  }

  const existing = await getPrisma().pCBuild.findFirst({
    where: { id: trimmed, userId: session.userId },
    select: { id: true },
  });
  if (!existing) {
    return fail("That build no longer exists.", true);
  }

  await getPrisma().pCBuild.delete({ where: { id: existing.id } });
  return ok(await listUserBuilds(session.userId), true);
}

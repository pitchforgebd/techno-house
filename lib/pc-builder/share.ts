/**
 * Signed-in shareable PC builds (P14-T05).
 *
 * Persisted links use an opaque `thb_` slug on `PCBuild.shareSlug`.
 * Public lookup returns name + selection only — never owner identity.
 * Guests and `DATA_SOURCE=mock` keep client-encoded slug maps.
 */
import { createSessionToken } from "@/lib/auth/session-token";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getPrisma } from "@/lib/db/prisma";
import {
  MAX_SAVED_BUILDS,
  SHARE_SLUG_PREFIX,
  decodeShareId,
  isPersistedShareSlug,
  sharePathForSlug,
  type BuildSelection,
  type SavedBuild,
} from "@/lib/domain/pc-builder";
import {
  BUILDS_DB_REQUIRED,
  BUILDS_SIGN_IN,
  listUserBuilds,
  prepareBuildItems,
  selectionFromBuildItems,
} from "@/lib/pc-builder/saved-builds";

const SHARED_BUILD_NAME = "Shared build";
const MINT_ATTEMPTS = 5;

export type PublicSharedBuild = {
  name: string;
  selection: BuildSelection;
  persisted: boolean;
};

export type ShareBuildResult =
  | { ok: true; sharePath: string; builds: SavedBuild[]; persisted: boolean }
  | { ok: false; formError: string; persisted: boolean };

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string, persisted: boolean): ShareBuildResult {
  return { ok: false, formError, persisted };
}

function ok(
  sharePath: string,
  builds: SavedBuild[],
  persisted: boolean,
): ShareBuildResult {
  return { ok: true, sharePath, builds, persisted };
}

async function pruneExtraSharedBuilds(userId: string): Promise<void> {
  const extras = await getPrisma().pCBuild.findMany({
    where: { userId, status: "SHARED" },
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

async function mintShareSlug(): Promise<string> {
  for (let attempt = 0; attempt < MINT_ATTEMPTS; attempt += 1) {
    const slug = `${SHARE_SLUG_PREFIX}${createSessionToken()}`;
    const existing = await getPrisma().pCBuild.findUnique({
      where: { shareSlug: slug },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not mint a unique share slug.");
}

export async function createShareFromSelection(input: {
  selection: BuildSelection;
}): Promise<ShareBuildResult> {
  if (!usesDatabase()) {
    return fail(BUILDS_DB_REQUIRED, false);
  }
  const session = await getCustomerSession();
  if (!session) {
    return fail(BUILDS_SIGN_IN, false);
  }

  const prepared = await prepareBuildItems(
    input.selection,
    "Select at least one part before sharing.",
  );
  if (!prepared.ok) {
    return fail(prepared.formError, true);
  }

  let shareSlug: string;
  try {
    shareSlug = await mintShareSlug();
  } catch {
    return fail("Could not create a share link. Try again.", true);
  }

  await getPrisma().pCBuild.create({
    data: {
      userId: session.userId,
      name: SHARED_BUILD_NAME,
      status: "SHARED",
      shareSlug,
      totalAmount: prepared.totalAmount,
      items: { create: prepared.items },
    },
  });
  await pruneExtraSharedBuilds(session.userId);
  return ok(
    sharePathForSlug(shareSlug),
    await listUserBuilds(session.userId),
    true,
  );
}

export async function shareSavedBuildById(
  id: string,
): Promise<ShareBuildResult> {
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
    where: { id: trimmed, userId: session.userId, status: "SAVED" },
    select: { id: true, shareSlug: true },
  });
  if (!existing) {
    return fail("That build no longer exists.", true);
  }

  if (existing.shareSlug && isPersistedShareSlug(existing.shareSlug)) {
    return ok(
      sharePathForSlug(existing.shareSlug),
      await listUserBuilds(session.userId),
      true,
    );
  }

  let shareSlug: string;
  try {
    shareSlug = await mintShareSlug();
  } catch {
    return fail("Could not create a share link. Try again.", true);
  }

  await getPrisma().pCBuild.update({
    where: { id: existing.id },
    data: { shareSlug },
  });
  return ok(
    sharePathForSlug(shareSlug),
    await listUserBuilds(session.userId),
    true,
  );
}

export async function getPublicSharedBuild(
  id: string,
): Promise<PublicSharedBuild | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }

  if (isPersistedShareSlug(trimmed) && usesDatabase()) {
    const row = await getPrisma().pCBuild.findUnique({
      where: { shareSlug: trimmed },
      select: {
        name: true,
        items: {
          select: {
            slot: true,
            product: { select: { slug: true } },
          },
        },
      },
    });
    if (!row) {
      return null;
    }
    return {
      name: row.name,
      selection: selectionFromBuildItems(row.items),
      persisted: true,
    };
  }

  const selection = decodeShareId(trimmed);
  if (!selection) {
    return null;
  }
  return {
    name: SHARED_BUILD_NAME,
    selection,
    persisted: false,
  };
}

"use server";

import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import type { BuildSelection } from "@/lib/domain/pc-builder";
import {
  deleteSavedBuild,
  listSavedBuilds,
  saveSavedBuild,
  type SavedBuildMutationResult,
} from "@/lib/pc-builder/saved-builds";
import {
  addBuildToCart,
  type AddBuildToCartResult,
} from "@/lib/pc-builder/add-to-cart";
import {
  createShareFromSelection,
  shareSavedBuildById,
  type ShareBuildResult,
} from "@/lib/pc-builder/share";

type MutationFailure = Extract<SavedBuildMutationResult, { ok: false }>;

async function guardOrigin(): Promise<MutationFailure | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR, persisted: true };
}

function shareBlocked(blocked: MutationFailure): ShareBuildResult {
  return {
    ok: false,
    formError: blocked.formError,
    persisted: blocked.persisted,
  };
}

export async function listSavedBuildsAction(): Promise<SavedBuildMutationResult> {
  return listSavedBuilds();
}

export async function saveSavedBuildAction(input: {
  name: string;
  selection: BuildSelection;
}): Promise<SavedBuildMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  return saveSavedBuild(input);
}

export async function deleteSavedBuildAction(
  id: string,
): Promise<SavedBuildMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  return deleteSavedBuild(id);
}

export async function createShareLinkAction(input: {
  selection: BuildSelection;
}): Promise<ShareBuildResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return shareBlocked(blocked);
  }
  return createShareFromSelection(input);
}

export async function shareSavedBuildAction(
  id: string,
): Promise<ShareBuildResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return shareBlocked(blocked);
  }
  return shareSavedBuildById(id);
}

export async function addBuildToCartAction(
  selection: BuildSelection,
): Promise<AddBuildToCartResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, reason: CROSS_ORIGIN_ERROR, persisted: true };
  }
  return addBuildToCart(selection);
}

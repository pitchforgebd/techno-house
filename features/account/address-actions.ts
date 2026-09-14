"use server";

import { revalidatePath } from "next/cache";
import {
  deleteCustomerAddress,
  saveCustomerAddress,
  setDefaultCustomerAddress,
  type AddressFields,
  type AddressResult,
} from "@/lib/account/addresses";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

async function guardOrigin(): Promise<AddressResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

/**
 * Ownership is never taken from the request: each library call re-reads the
 * session and scopes its query by that `userId`, so passing someone else's
 * address id here resolves to "no longer exists".
 */
export async function saveAddressAction(input: {
  id?: string;
  fields: AddressFields;
}): Promise<AddressResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const result = await saveCustomerAddress(input);
  if (result.ok) {
    revalidatePath("/account/addresses");
    revalidatePath("/account");
  }
  return result;
}

export async function deleteAddressAction(id: string): Promise<AddressResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const result = await deleteCustomerAddress(id);
  if (result.ok) {
    revalidatePath("/account/addresses");
    revalidatePath("/account");
  }
  return result;
}

export async function setDefaultAddressAction(
  id: string,
): Promise<AddressResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const result = await setDefaultCustomerAddress(id);
  if (result.ok) {
    revalidatePath("/account/addresses");
    revalidatePath("/account");
  }
  return result;
}

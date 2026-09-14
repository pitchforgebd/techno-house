/**
 * Customer address book.
 *
 * The `Address` model has existed since the schema was laid out but nothing
 * ever read or wrote it — `/account/addresses` was a "coming soon" stub and
 * checkout collected the address as free text on every order. This is the
 * first code to use the table.
 *
 * Server only. Every function scopes its query by `userId` taken from the
 * session, never from the request body, so one customer cannot reach
 * another's addresses by guessing an id.
 */
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";
import {
  ADDRESS_AREA_MAX,
  ADDRESS_CITY_MAX,
  ADDRESS_LABEL_MAX,
  ADDRESS_LIMIT,
  ADDRESS_LINE_MAX,
  ADDRESS_NAME_MAX,
  ADDRESS_PHONE_MAX,
  ADDRESS_POSTCODE_MAX,
  type AddressFields,
  type CustomerAddress,
} from "@/lib/account/address-limits";

// Re-exported so server callers have one import for the whole feature.
export type { AddressFields, CustomerAddress };

export type AddressResult =
  | { ok: true; id: string }
  | { ok: false; formError: string; field?: keyof AddressFields };

const SELECT = {
  id: true,
  label: true,
  fullName: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  area: true,
  city: true,
  postcode: true,
  isDefault: true,
} as const;

function trim(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function parse(
  input: AddressFields,
):
  | { ok: true; value: Omit<CustomerAddress, "id"> }
  | { ok: false; formError: string; field: keyof AddressFields } {
  const fullName = trim(input.fullName, ADDRESS_NAME_MAX);
  if (!fullName) {
    return {
      ok: false,
      formError: "Enter the recipient's name.",
      field: "fullName",
    };
  }

  const phone = trim(input.phone, ADDRESS_PHONE_MAX);
  // Deliberately loose: Bangladeshi numbers get written with and without the
  // country code, with spaces and with dashes. Rejecting formats here would
  // block real addresses for no safety gain — the courier reads this, not code.
  if (phone.replace(/\D/g, "").length < 6) {
    return {
      ok: false,
      formError: "Enter a usable phone number.",
      field: "phone",
    };
  }

  const addressLine1 = trim(input.addressLine1, ADDRESS_LINE_MAX);
  if (!addressLine1) {
    return {
      ok: false,
      formError: "Enter the street address.",
      field: "addressLine1",
    };
  }

  const city = trim(input.city, ADDRESS_CITY_MAX);
  if (!city) {
    return { ok: false, formError: "Enter the city.", field: "city" };
  }

  return {
    ok: true,
    value: {
      label: trim(input.label, ADDRESS_LABEL_MAX) || null,
      fullName,
      phone,
      addressLine1,
      addressLine2: trim(input.addressLine2, ADDRESS_LINE_MAX) || null,
      area: trim(input.area, ADDRESS_AREA_MAX) || null,
      city,
      postcode: trim(input.postcode, ADDRESS_POSTCODE_MAX) || null,
      isDefault: input.isDefault,
    },
  };
}

export async function listCustomerAddresses(): Promise<CustomerAddress[]> {
  const session = await getCustomerSession();
  if (!session || !usesDatabase()) {
    return [];
  }
  return getPrisma().address.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: SELECT,
  });
}

/**
 * Exactly one address per customer carries `isDefault`. Clearing the others
 * and setting this one happen in a single transaction so a failure cannot
 * leave an account with two defaults or none.
 */
async function applyDefault(userId: string, addressId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId, NOT: { id: addressId } },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);
}

export async function saveCustomerAddress(input: {
  id?: string;
  fields: AddressFields;
}): Promise<AddressResult> {
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to manage your addresses." };
  }
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Addresses need the database. Turn off DATA_SOURCE=mock.",
    };
  }

  const parsed = parse(input.fields);
  if (!parsed.ok) {
    return parsed;
  }

  const prisma = getPrisma();
  const userId = session.userId;

  // The count and the insert run under a lock on the owning User row
  // (DSA-09). They used to be two unrelated statements, so concurrent saves
  // all read the same count and all inserted, letting one account exceed
  // ADDRESS_LIMIT. There is no unique constraint that can express "at most N
  // rows", so serialising on the owner is the mechanism.
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const existingCount = await tx.address.count({
      where: { userId },
    });

    let addressId: string;

    if (input.id) {
      // Scoped by userId as well as id: an id from the request body is never
      // enough on its own to reach a row.
      const owned = await tx.address.findFirst({
        where: { id: input.id, userId },
        select: { id: true },
      });
      if (!owned) {
        return {
          ok: false as const,
          formError: "That address no longer exists.",
        };
      }
      await tx.address.update({
        where: { id: owned.id },
        data: { ...parsed.value, isDefault: false },
      });
      addressId = owned.id;
    } else {
      if (existingCount >= ADDRESS_LIMIT) {
        return {
          ok: false as const,
          formError: `You can save up to ${ADDRESS_LIMIT} addresses. Delete one first.`,
        };
      }
      const created = await tx.address.create({
        data: {
          ...parsed.value,
          isDefault: false,
          userId,
        },
        select: { id: true },
      });
      addressId = created.id;
    }

    return { ok: true as const, addressId, existingCount };
  });

  if (!outcome.ok) {
    return outcome;
  }
  const { addressId, existingCount } = outcome;

  // The first address saved is the default whether or not the box was ticked —
  // an account with addresses but no default would have nothing to prefill.
  if (parsed.value.isDefault || existingCount === 0) {
    await applyDefault(session.userId, addressId);
  }

  return { ok: true, id: addressId };
}

export async function deleteCustomerAddress(
  id: string,
): Promise<AddressResult> {
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to manage your addresses." };
  }
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Addresses need the database. Turn off DATA_SOURCE=mock.",
    };
  }

  const prisma = getPrisma();
  const owned = await prisma.address.findFirst({
    where: { id, userId: session.userId },
    select: { id: true, isDefault: true },
  });
  if (!owned) {
    return { ok: false, formError: "That address no longer exists." };
  }

  await prisma.address.delete({ where: { id: owned.id } });

  // Deleting the default would otherwise leave the account without one.
  if (owned.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (next) {
      await applyDefault(session.userId, next.id);
    }
  }

  return { ok: true, id: owned.id };
}

export async function setDefaultCustomerAddress(
  id: string,
): Promise<AddressResult> {
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to manage your addresses." };
  }
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Addresses need the database. Turn off DATA_SOURCE=mock.",
    };
  }
  const owned = await getPrisma().address.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!owned) {
    return { ok: false, formError: "That address no longer exists." };
  }
  await applyDefault(session.userId, owned.id);
  return { ok: true, id: owned.id };
}

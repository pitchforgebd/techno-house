/**
 * Address field limits and the row shape, split out so Client Components can
 * import them.
 *
 * `lib/account/addresses.ts` imports Prisma and the session helpers; pulling
 * any export from there into a client file drags server-only code into the
 * browser bundle and breaks the route build. Keep this file free of imports.
 */
export const ADDRESS_LABEL_MAX = 40;
export const ADDRESS_NAME_MAX = 80;
export const ADDRESS_PHONE_MAX = 20;
export const ADDRESS_LINE_MAX = 160;
export const ADDRESS_AREA_MAX = 80;
export const ADDRESS_CITY_MAX = 80;
export const ADDRESS_POSTCODE_MAX = 12;

/** More than anyone needs, and a cap on what one account can store. */
export const ADDRESS_LIMIT = 20;

export type CustomerAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  area: string | null;
  city: string;
  postcode: string | null;
  isDefault: boolean;
};

export type AddressFields = {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  area: string;
  city: string;
  postcode: string;
  isDefault: boolean;
};

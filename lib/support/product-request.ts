export const PRODUCT_REQUEST_NAME_MAX = 120;
export const PRODUCT_REQUEST_DETAILS_MAX = 500;

export function parseProductRequestName(
  raw: FormDataEntryValue | null,
): string {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().slice(0, PRODUCT_REQUEST_NAME_MAX);
}

export function parseProductRequestDetails(
  raw: FormDataEntryValue | null,
): string {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().slice(0, PRODUCT_REQUEST_DETAILS_MAX);
}

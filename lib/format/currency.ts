/** Storefront display currency. Authoritative amounts will be BDT on the server. */
export const CURRENCY_CODE = "BDT";

/** UI symbol for Bangladeshi Taka. Do not use "Tk" in new UI. */
export const CURRENCY_SYMBOL = "৳";

/** Display-only. Not authoritative for charges. */
export function formatMoney(money: { amount: number }): string {
  return `${CURRENCY_SYMBOL}\u00A0${money.amount.toLocaleString("en-US")}`;
}

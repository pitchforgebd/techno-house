import { CURRENCY_CODE } from "@/lib/format/currency";

export type CurrencyCode = typeof CURRENCY_CODE;

/** Integer taka. Display with `CURRENCY_SYMBOL`. Not authoritative for charges. */
export type Money = {
  amount: number;
  currency: CurrencyCode;
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type SpecChip = {
  label: string;
  value: string;
};

export type ProductImage = {
  src: string;
  alt: string;
};

export type SpecRow = {
  key: string;
  value: string;
};

export type SpecGroup = {
  title: string;
  rows: SpecRow[];
};

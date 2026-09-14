export type AdminLabelTextTone = "light" | "dark";

export type AdminCustomLabel = {
  id: string;
  text: string;
  backgroundColor: string;
  textTone: AdminLabelTextTone;
  /** System labels cannot be bulk-selected or deleted. */
  isSystem: boolean;
  source: "inhouse" | "system";
  status: boolean;
  productIds: string[];
};

/** Storefront product badges — mock admin catalog (single-vendor). */
export const MOCK_CUSTOM_LABELS: AdminCustomLabel[] = [
  {
    id: "label-flash-sale",
    text: "Flash Sale",
    backgroundColor: "#f59e0b",
    textTone: "light",
    isSystem: true,
    source: "system",
    status: true,
    productIds: [],
  },
  {
    id: "label-todays-deal",
    text: "Todays Deal",
    backgroundColor: "#14b8a6",
    textTone: "light",
    isSystem: true,
    source: "system",
    status: true,
    productIds: [],
  },
  {
    id: "label-percent",
    text: "-x%",
    backgroundColor: "#ef4444",
    textTone: "light",
    isSystem: true,
    source: "system",
    status: true,
    productIds: [],
  },
  {
    id: "label-wholesale",
    text: "Wholesale",
    backgroundColor: "#4b5563",
    textTone: "light",
    isSystem: false,
    source: "inhouse",
    status: true,
    productIds: [],
  },
  {
    id: "label-top-choice",
    text: "Top Choice",
    backgroundColor: "#ea580c",
    textTone: "light",
    isSystem: false,
    source: "inhouse",
    status: true,
    productIds: [],
  },
  {
    id: "label-free-shipping",
    text: "Free Shipping",
    backgroundColor: "#84cc16",
    textTone: "dark",
    isSystem: false,
    source: "inhouse",
    status: true,
    productIds: [],
  },
];

export function getMockLabelById(id: string): AdminCustomLabel | null {
  return MOCK_CUSTOM_LABELS.find((item) => item.id === id) ?? null;
}

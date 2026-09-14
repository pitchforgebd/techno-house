export const NOTE_TYPES = [
  "Shipping",
  "Refund",
  "Warranty",
  "Delivery",
  "Cash on delivery",
] as const;

export type AdminNoteType = (typeof NOTE_TYPES)[number];

export type AdminNote = {
  id: string;
  type: AdminNoteType;
  description: string;
};

/** Preset product notes for admin PDP sections (single-vendor). */
export const MOCK_ADMIN_NOTES: AdminNote[] = [
  {
    id: "note-shipping-1",
    type: "Shipping",
    description:
      "Estimated delivery is 3–5 working days inside Dhaka and 5–7 days elsewhere. Tracking is shared after dispatch.",
  },
  {
    id: "note-refund-1",
    type: "Refund",
    description:
      "Eligible refunds are processed to the original payment method within 7–10 working days after approval.",
  },
  {
    id: "note-warranty-1",
    type: "Warranty",
    description:
      "Official brand warranty applies as listed on the product. Keep invoice and serial for service claims.",
  },
  {
    id: "note-delivery-1",
    type: "Delivery",
    description:
      "Cash on delivery is available in selected areas. Please keep the exact amount ready for the rider.",
  },
  {
    id: "note-cod-1",
    type: "Cash on delivery",
    description:
      "COD orders may require phone confirmation. Orders can be cancelled if the customer is unreachable.",
  },
  {
    id: "note-shipping-2",
    type: "Shipping",
    description:
      "Free shipping may apply on selected deals. Oversized items can incur an extra handling charge.",
  },
  {
    id: "note-warranty-2",
    type: "Warranty",
    description:
      "Physical damage, liquid damage, and unauthorized repair are not covered under standard warranty.",
  },
];

export const NOTE_DESCRIPTION_MAX = 900;

export type AdminWarranty = {
  id: string;
  text: string;
  /** Short badge label shown in the logo column. */
  badge: string;
  /** Uploaded logo image, shown instead of `badge` when set. */
  logoSrc?: string | null;
};

/** Warranty presets used across Techno House gadget products. */
export const MOCK_ADMIN_WARRANTIES: AdminWarranty[] = [
  { id: "warranty-5y", text: "5 Year", badge: "5Y", logoSrc: null },
  { id: "warranty-3y", text: "3 Year", badge: "3Y", logoSrc: null },
  { id: "warranty-2y", text: "2 Year", badge: "2Y", logoSrc: null },
  { id: "warranty-1y", text: "1 Year", badge: "1Y", logoSrc: null },
  { id: "warranty-lifetime", text: "Lifetime", badge: "LT", logoSrc: null },
  { id: "warranty-6m", text: "6 Months", badge: "6M", logoSrc: null },
];

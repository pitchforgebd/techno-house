export type AdminUnit = {
  id: string;
  name: string;
};

/** Sellable units for Techno House physical gadget products. */
export const MOCK_ADMIN_UNITS: AdminUnit[] = [
  { id: "unit-pc", name: "Pc" },
  { id: "unit-piece", name: "Piece" },
  { id: "unit-set", name: "Set" },
  { id: "unit-box", name: "Box" },
  { id: "unit-pair", name: "Pair" },
  { id: "unit-unit", name: "Unit" },
  { id: "unit-pack", name: "Pack" },
  { id: "unit-bundle", name: "Bundle" },
];

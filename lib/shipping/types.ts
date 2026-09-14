export type AdminShippingMethod = {
  id: string;
  code: string;
  name: string;
  description: string;
  baseRate: number;
  isPickup: boolean;
  isActive: boolean;
  position: number;
  zoneCodes: string[];
};

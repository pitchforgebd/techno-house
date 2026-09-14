/**
 * Client-safe EMI helpers (no Prisma / Node imports).
 */
export const EMI_TENURE_OPTIONS = [3, 6, 12] as const;

export type AdminEmiConfig = {
  enabled: boolean;
  tenureMonths: number[];
  partnerName: string;
  interestNote: string;
  minOrderAmount: number;
  updatedAt: string | null;
};

import type { Metadata } from "next";
import { AdminWalletLedgerReport } from "@/features/admin/reports/admin-search-wallet-reports";
import { loadWalletLedger } from "@/lib/admin/load-report-center";

export const metadata: Metadata = {
  title: "Wallet Adjustment Ledger",
};

export default async function Page() {
  const rows = await loadWalletLedger();
  return <AdminWalletLedgerReport rows={rows} />;
}

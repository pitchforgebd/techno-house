import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportCsvExportButton } from "@/features/admin/reports/report-csv-export";
import type { UserSearchRow } from "@/lib/admin/report-center-mock";
import type { WalletLedgerRow } from "@/lib/admin/load-report-center";

export function AdminUserSearchReport({ rows }: { rows: UserSearchRow[] }) {
  const csvRows: (string | number)[][] = rows.map((row, index) => [
    index + 1,
    row.query,
    row.count,
  ]);

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 pb-10">
      <div className="rounded-xl border border-neutral-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <h1 className="text-lg font-semibold text-neutral-900">
            User Search Report
          </h1>
          <ReportCsvExportButton
            filename={`user-search-report-${new Date().toISOString().slice(0, 10)}.csv`}
            headers={["#", "Search Query", "Number of Searches"]}
            rows={csvRows}
            label={`Export all ${rows.length} rows CSV`}
          />
        </div>
        <div className="overflow-x-auto px-2">
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeader className="w-12">#</TableHeader>
                <TableHeader>Search By</TableHeader>
                <TableHeader>Number searches</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-10 text-center text-neutral-400">
                    No real searches logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums text-neutral-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-neutral-800">
                      {row.query}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function signedAmount(amount: number): string {
  const sign = amount >= 0 ? "+" : "−";
  return `${sign}৳ ${Math.abs(amount).toLocaleString("en-US")}`;
}

export function AdminWalletLedgerReport({
  rows,
}: {
  rows: WalletLedgerRow[];
}) {
  const csvRows: (string | number)[][] = rows.map((row, index) => [
    index + 1,
    row.customerName,
    row.email,
    row.amount,
    row.balanceAfter,
    row.reason ?? "",
    row.adjustedBy,
    row.createdAt,
  ]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Wallet Adjustment Ledger
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Every real wallet balance change made by staff. There is no
            customer-facing wallet top-up yet, so this is an adjustment
            ledger, not a payment recharge log.
          </p>
        </div>
        <ReportCsvExportButton
          filename={`wallet-adjustment-ledger-${new Date().toISOString().slice(0, 10)}.csv`}
          headers={[
            "#",
            "Customer",
            "Email",
            "Amount",
            "Balance After",
            "Reason",
            "Adjusted By",
            "Date",
          ]}
          rows={csvRows}
          label={`Export all ${rows.length} rows CSV`}
        />
      </div>
      <div className="rounded-xl border border-neutral-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeader className="w-12">#</TableHeader>
                <TableHeader>Customer</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Balance After</TableHeader>
                <TableHeader>Reason</TableHeader>
                <TableHeader>Adjusted By</TableHeader>
                <TableHeader>Date</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-10 text-center text-neutral-400">
                    No wallet adjustments yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums text-neutral-500">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-neutral-900">
                        {row.customerName}
                      </p>
                      <p className="text-xs text-neutral-500">{row.email}</p>
                    </TableCell>
                    <TableCell
                      className={
                        row.amount >= 0
                          ? "tabular-nums text-emerald-600"
                          : "tabular-nums text-red-600"
                      }
                    >
                      {signedAmount(row.amount)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      ৳ {row.balanceAfter.toLocaleString("en-US")}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {row.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {row.adjustedBy}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-neutral-600">
                      {row.createdAt}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

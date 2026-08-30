import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { SpecGroup } from "@/lib/data";
import { cn } from "@/lib/cn";

type ProductSpecificationsProps = {
  groups: SpecGroup[];
  productName: string;
};

export function ProductSpecifications({
  groups,
  productName,
}: ProductSpecificationsProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <p className="text-caption text-text-muted">
        Specs for {productName} are for shopping guidance. Confirm details
        before purchase when the catalog is live.
      </p>
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="mb-2 text-label font-semibold text-text">
            {group.title}
          </h3>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableBody>
                {group.rows.map((row, index) => (
                  <TableRow
                    key={`${group.title}-${row.key}`}
                    className={cn(
                      index % 2 === 1 ? "bg-surface-muted/50" : undefined,
                    )}
                  >
                    <TableCell className="w-[40%] font-mono text-label text-text-muted">
                      {row.key}
                    </TableCell>
                    <TableCell className="text-body text-text">
                      {row.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

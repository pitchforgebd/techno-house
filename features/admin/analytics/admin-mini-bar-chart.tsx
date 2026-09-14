import { cn } from "@/lib/cn";

export function AdminMiniBarChart({
  items,
  maxValue,
  className,
}: {
  items: { label: string; value: number }[];
  maxValue?: number;
  className?: string;
}) {
  const peak = maxValue ?? Math.max(...items.map((item) => item.value), 1);

  return (
    <div className={cn("flex items-end gap-2", className)}>
      {items.map((item) => {
        const heightPercent = Math.max(8, Math.round((item.value / peak) * 100));
        return (
          <div
            key={item.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <span className="text-caption tabular-nums text-text-muted">
              {item.value.toLocaleString()}
            </span>
            <div
              className="w-full rounded-t-sm bg-primary/80 transition-all"
              style={{ height: `${heightPercent}px`, minHeight: "8px", maxHeight: "120px" }}
              title={`${item.label}: ${item.value.toLocaleString()}`}
            />
            <span className="truncate text-caption text-text-muted">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminHorizontalBars({
  items,
  className,
}: {
  items: { label: string; value: number; sharePercent: number }[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-caption">
            <span className="text-text">{item.label}</span>
            <span className="tabular-nums text-text-muted">
              {item.sharePercent}% · {item.value.toLocaleString()}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${item.sharePercent}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

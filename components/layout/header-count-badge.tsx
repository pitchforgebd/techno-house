import { cn } from "@/lib/cn";

export function HeaderCountBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1",
        "text-[10px] font-medium tabular-nums leading-none text-white",
        count > 0 ? "bg-danger" : "bg-text-muted",
      )}
    >
      {count}
    </span>
  );
}

import type { AdminLabelTextTone } from "@/lib/admin/labels-mock";
import { cn } from "@/lib/cn";

export function AdminLabelBadge({
  text,
  backgroundColor,
  textTone,
  className,
}: {
  text: string;
  backgroundColor: string;
  textTone: AdminLabelTextTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full px-3 py-1 text-xs font-semibold",
        textTone === "light" ? "text-white" : "text-neutral-900",
        className,
      )}
      style={{ backgroundColor }}
    >
      {text}
    </span>
  );
}

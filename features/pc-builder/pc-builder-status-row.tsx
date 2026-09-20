import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** One compact status line in the build summary (stock, power, compatibility).
 * Shared so the three read as one consistent group rather than three
 * separately-styled panels. */
export function PcBuilderStatusRow({
  icon: Icon,
  label,
  children,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClassName =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-text-muted";

  return (
    <div className="flex gap-2.5 px-3 py-2.5">
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-4 shrink-0", toneClassName)}
        strokeWidth={1.75}
      />
      <div className="min-w-0">
        <p className="text-caption font-semibold text-text">{label}</p>
        <p className="mt-0.5 text-caption text-text-muted">{children}</p>
      </div>
    </div>
  );
}

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: ReactNode;
};

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-start gap-2 text-body text-text">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded-sm border-border accent-primary",
          className,
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

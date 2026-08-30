import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
};

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-center gap-2 text-body text-text">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "size-4 rounded-sm border-border accent-primary",
          className,
        )}
        {...props}
      />
      {label}
    </label>
  );
}

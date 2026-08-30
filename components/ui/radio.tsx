import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function RadioGroup({
  legend,
  children,
  className,
}: {
  legend: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="text-label font-medium text-text">{legend}</legend>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </fieldset>
  );
}

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function Radio({ label, className, ...props }: RadioProps) {
  return (
    <label className="inline-flex items-center gap-2 text-body text-text">
      <input
        type="radio"
        className={cn("size-4 border-border accent-primary", className)}
        {...props}
      />
      {label}
    </label>
  );
}

import type { SelectHTMLAttributes } from "react";
import { controlClassName } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={cn(controlClassName(), className)} {...props}>
      {children}
    </select>
  );
}

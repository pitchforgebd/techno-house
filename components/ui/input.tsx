import type { InputHTMLAttributes } from "react";
import { controlClassName } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(controlClassName(), className)} {...props} />;
}

import type { TextareaHTMLAttributes } from "react";
import { controlClassName } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(controlClassName(), "min-h-24 resize-y", className)}
      {...props}
    />
  );
}

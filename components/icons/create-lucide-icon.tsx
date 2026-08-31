import type { LucideIcon, LucideProps } from "lucide-react";
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";

export type IconComponent = (props: LucideProps) => ReactElement;

export function createLucideIcon(
  Icon: LucideIcon,
  defaultClassName: string,
): IconComponent {
  function LucideIconWrapper({ className, ...props }: LucideProps) {
    return (
      <Icon
        aria-hidden
        strokeWidth={1.75}
        className={cn(defaultClassName, className)}
        {...props}
      />
    );
  }
  LucideIconWrapper.displayName = `LucideIcon(${Icon.displayName ?? Icon.name})`;
  return LucideIconWrapper;
}

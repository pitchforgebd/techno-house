import { Cpu } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PcBuilderWorkspace } from "@/features/pc-builder/pc-builder-workspace";

export function PcBuilderShell() {
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <Breadcrumbs
        items={[{ href: "/", label: "Home" }, { label: "PC Builder" }]}
      />
      <header className="mt-4 overflow-hidden rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-stretch">
          <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-5 sm:px-6">
            <p className="text-caption font-medium uppercase tracking-wide text-primary">
              Custom desktop builder
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">
              PC Builder
            </h1>
            <p className="mt-2 max-w-prose text-body text-text-muted">
              Pick each component slot by slot, check compatibility, and review
              the running total before you add the build to cart.
            </p>
          </div>
          <div className="flex items-center justify-center border-t border-border bg-surface-muted/50 px-8 py-6 sm:border-t-0 sm:border-l">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Cpu className="size-8" strokeWidth={1.75} aria-hidden />
            </span>
          </div>
        </div>
      </header>
      <div className="mt-8">
        <PcBuilderWorkspace />
      </div>
    </div>
  );
}

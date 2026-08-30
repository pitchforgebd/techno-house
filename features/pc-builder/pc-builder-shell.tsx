import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PcBuilderWorkspace } from "@/features/pc-builder/pc-builder-workspace";

export function PcBuilderShell() {
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <Breadcrumbs
        items={[{ href: "/", label: "Home" }, { label: "PC Builder" }]}
      />
      <header className="mt-4 max-w-prose">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          PC Builder
        </h1>
        <p className="mt-2 text-body text-text-muted">
          Assemble a desktop from Techno House parts. Pick a slot, add a
          component, and review the running total before you buy.
        </p>
      </header>
      <div className="mt-8">
        <PcBuilderWorkspace />
      </div>
    </div>
  );
}

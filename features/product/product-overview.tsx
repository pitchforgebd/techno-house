import type { SpecChip } from "@/lib/data";

type ProductOverviewProps = {
  overview: string[];
  specs: SpecChip[];
};

export function ProductOverview({ overview, specs }: ProductOverviewProps) {
  const chips = specs.slice(0, 5);
  if (overview.length === 0 && chips.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {overview.length > 0 ? (
        <div>
          <h2 className="text-label font-semibold tracking-tight text-text">
            Quick overview
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body text-text-muted">
            {overview.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div>
          <h2 className="text-label font-semibold tracking-tight text-text">
            Key specs
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((spec) => (
              <li key={`${spec.label}-${spec.value}`}>
                <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-text-muted">
                  <span className="font-mono text-text">{spec.label}</span>
                  <span className="mx-1 text-border">·</span>
                  {spec.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

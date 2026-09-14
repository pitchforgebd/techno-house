import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { MarketingListParams } from "@/lib/admin/marketing-list-params";

const STATUS_OPTIONS: { value: MarketingListParams["status"]; label: string }[] =
  [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "scheduled", label: "Scheduled" },
    { value: "draft", label: "Draft" },
    { value: "paused", label: "Paused" },
    { value: "ended", label: "Ended" },
  ];

export function AdminCampaignFilters({
  actionPath,
  params,
}: {
  actionPath: string;
  params: MarketingListParams;
}) {
  return (
    <form
      method="get"
      action={actionPath}
      className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="min-w-0 flex-1 space-y-1 sm:min-w-[12rem]">
        <span className="text-caption font-medium text-text-muted">
          Search
        </span>
        <Input
          name="q"
          type="search"
          defaultValue={params.q}
          placeholder="Name, slug…"
          className="min-h-10"
        />
      </label>
      <label className="space-y-1 sm:w-40">
        <span className="text-caption font-medium text-text-muted">Status</span>
        <Select name="status" defaultValue={params.status}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-caption font-medium text-primary-foreground hover:bg-primary/90"
      >
        Apply
      </button>
    </form>
  );
}

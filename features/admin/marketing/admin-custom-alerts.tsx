"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ImageIcon,
  Lock,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Alert as ErrorAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import {
  bulkDeleteAlertsAction,
  bulkSetAlertsEnabledAction,
  saveAlertAction,
  setAlertEnabledAction,
} from "@/features/admin/marketing/alert-actions";
import { saveSaleAlertSettingsAction } from "@/features/admin/marketing/sale-alert-actions";
import type { AdminAlert, AlertLocation } from "@/lib/marketing/alerts";
import type {
  PickableProduct,
  SaleAlertProductScope,
  SaleAlertSettingsView,
} from "@/lib/marketing/sale-alerts";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const LOCATIONS: {
  id: AlertLocation;
  label: string;
  corner: "bl" | "br" | "tl" | "tr";
}[] = [
  { id: "bottom-left", label: "From Bottom-left", corner: "bl" },
  { id: "bottom-right", label: "From Bottom-right", corner: "br" },
  { id: "top-left", label: "From Top-left", corner: "tl" },
  { id: "top-right", label: "From Top-right", corner: "tr" },
];

function LocationIcon({
  corner,
  active,
}: {
  corner: "bl" | "br" | "tl" | "tr";
  active: boolean;
}) {
  const box =
    corner === "bl"
      ? "bottom-2 left-2"
      : corner === "br"
        ? "bottom-2 right-2"
        : corner === "tl"
          ? "top-2 left-2"
          : "top-2 right-2";
  const Arrow = corner.startsWith("b") ? ArrowUp : ArrowDown;
  return (
    <div
      className={cn(
        "relative h-20 w-28 rounded-md border bg-neutral-50",
        active ? "border-[#3897f0]" : "border-neutral-200",
      )}
    >
      <div
        className={cn(
          "absolute flex h-6 w-10 items-center justify-center rounded-sm text-white",
          box,
          active ? "bg-[#3897f0]" : "bg-sky-300",
        )}
      >
        <Arrow className="size-3" aria-hidden />
      </div>
    </div>
  );
}

export function AdminCustomAlertsPage({ rows }: { rows: AdminAlert[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuId, setMenuId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.text.toLowerCase().includes(q));
  }, [rows, query]);

  function toggleEnabled(row: AdminAlert, checked: boolean) {
    startTransition(async () => {
      const result = await setAlertEnabledAction({
        id: row.id,
        enabled: checked,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      router.refresh();
    });
  }

  function runBulkAction(value: string) {
    const ids = [...selected];
    startTransition(async () => {
      const result =
        value === "delete"
          ? await bulkDeleteAlertsAction({ ids })
          : await bulkSetAlertsEnabledAction({
              ids,
              enabled: value === "enable",
            });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        `Updated ${result.count} alert${result.count === 1 ? "" : "s"}.`,
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  function deleteOne(id: string) {
    startTransition(async () => {
      const result = await bulkDeleteAlertsAction({ ids: [id] });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Alert deleted");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Custom Alerts
        </h1>
        <Link
          href="/admin/marketing/alerts/new"
          className="inline-flex items-center rounded-full bg-[#6c5ce7] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#5b4bd6]"
        >
          Create New Custom Alert
        </Link>
      </div>

      <p className="text-sm text-neutral-500">
        Only the first enabled alert (by position, then oldest) shows to a
        visitor, once per browser session. Each alert has its own corner
        location, set on its edit page.
      </p>

      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-900">
            All Custom Alerts
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Bulk action"
              className={cn(controlClass, "w-auto min-w-[8.5rem]")}
              defaultValue=""
              onChange={(event) => {
                const value = event.target.value;
                event.target.value = "";
                if (!value) return;
                if (selected.size === 0) {
                  notifyError("Select at least one alert first");
                  return;
                }
                runBulkAction(value);
              }}
            >
              <option value="">Bulk Action</option>
              <option value="enable">Enable</option>
              <option value="disable">Disable</option>
              <option value="delete">Delete</option>
            </select>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type name & Enter."
                className={cn(controlClass, "w-48 pl-9 sm:w-56")}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-400">
            No custom alerts yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeader className="w-10" />
                  <TableHeader className="w-8" />
                  <TableHeader className="w-14 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Image
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Text
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Link
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Location
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Trigger
                  </TableHeader>
                  <TableHeader className="w-16 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Actions
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        disabled={row.isLocked}
                        onChange={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          });
                        }}
                        className="size-4 rounded border-neutral-300"
                        aria-label={`Select alert ${row.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      {row.isLocked ? (
                        <Lock
                          className="size-3.5 text-neutral-400"
                          aria-hidden
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.imagePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.imagePath}
                          alt=""
                          className="size-10 rounded-md border border-neutral-100 object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50 text-neutral-300">
                          <ImageIcon className="size-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-sm text-sm text-neutral-800">
                      {row.text}
                      {row.linkLabel ? (
                        <>
                          {" "}
                          <span className="font-medium text-[#3897f0]">
                            ({row.linkLabel})
                          </span>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {row.link ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                        {row.location}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AdminToggleSwitch
                        label={`Trigger ${row.id}`}
                        checked={row.enabled}
                        onChange={(checked) => toggleEnabled(row, checked)}
                      />
                    </TableCell>
                    <TableCell className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuId((id) => (id === row.id ? null : row.id))
                        }
                        className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500"
                        aria-label="Actions"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                      {menuId === row.id ? (
                        <div className="absolute right-2 z-20 mt-1 min-w-[7rem] rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                          <Link
                            href={`/admin/marketing/alerts/${row.id}`}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-50"
                            onClick={() => setMenuId(null)}
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Link>
                          {!row.isLocked ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setMenuId(null);
                                deleteOne(row.id);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminCustomAlertForm({
  initial,
}: {
  initial?: AdminAlert | null;
}) {
  const router = useRouter();
  const [size, setSize] = useState<"small" | "large">(initial?.size ?? "small");
  const [location, setLocation] = useState<AlertLocation>(
    initial?.location ?? "bottom-left",
  );
  const [link, setLink] = useState(initial?.link ?? "");
  const [linkLabel, setLinkLabel] = useState(initial?.linkLabel ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [bg, setBg] = useState(initial?.backgroundColor ?? "#000000");
  const [tone, setTone] = useState<"light" | "dark">(
    initial?.textTone ?? "light",
  );
  const [autoClose, setAutoClose] = useState(
    initial?.autoCloseSeconds ? String(initial.autoCloseSeconds) : "disabled",
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    if (initial?.id) {
      formData.set("id", initial.id);
    }
    startTransition(async () => {
      const result = await saveAlertAction(formData);
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      notifySuccess(initial ? "Custom alert saved" : "Custom alert created");
      router.push("/admin/marketing/alerts");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Custom Alert Information
        </h1>
        <Link
          href="/admin/marketing/alerts"
          className="text-sm font-medium text-[#3897f0] hover:underline"
        >
          ← Back to alerts
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          className="space-y-5 rounded-lg border border-border bg-surface p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          {error ? (
            <ErrorAlert tone="danger" title="Cannot save">
              <p className="text-caption">{error}</p>
            </ErrorAlert>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-800">
              Select Alert Location
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {LOCATIONS.map((item) => {
                const active = location === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLocation(item.id)}
                    disabled={pending}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <LocationIcon corner={item.corner} active={active} />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        active ? "text-[#3897f0]" : "text-neutral-600",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="location" value={location} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-800">
              Select Alert Size
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["small", "large"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  disabled={pending}
                  className={cn(
                    "rounded-lg border px-4 py-6 text-sm font-semibold capitalize",
                    size === option
                      ? "border-[#3897f0] text-[#3897f0] ring-1 ring-[#3897f0]"
                      : "border-neutral-200 text-neutral-600",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <input type="hidden" name="size" value={size} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">
              Image{" "}
              <span className="text-xs font-normal text-neutral-400">
                (120px × 140px)
              </span>
            </span>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 text-sm">
              <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium">
                Browse
              </span>
              <span className="truncate text-neutral-400">
                {fileName ??
                  (initial?.imagePath ? "Replace image" : "Choose File")}
              </span>
              <input
                type="file"
                name="image"
                accept="image/*"
                className="sr-only"
                disabled={pending}
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Link</span>
            <Input
              name="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
              className={controlClass}
              disabled={pending}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Link label</span>
            <Input
              name="linkLabel"
              value={linkLabel}
              maxLength={40}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="e.g. here, Learn more"
              className={controlClass}
              disabled={pending}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">
              Text{" "}
              <span className="text-xs font-normal text-neutral-400">
                (Best within 200 character)
              </span>
            </span>
            <textarea
              name="text"
              value={text}
              maxLength={200}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your text here."
              rows={4}
              required
              disabled={pending}
              className={cn(controlClass, "h-auto py-2")}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">
              Select Background Color
            </span>
            <div className="flex items-center gap-2">
              <Input
                name="backgroundColor"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className={controlClass}
                disabled={pending}
              />
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="size-10 rounded border border-neutral-200"
                aria-label="Background color"
                disabled={pending}
              />
            </div>
          </label>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Select Text Color</p>
            <div className="flex gap-4">
              {(["light", "dark"] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="textTone"
                    value={option}
                    checked={tone === option}
                    onChange={() => setTone(option)}
                    disabled={pending}
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Auto Close After</span>
            <select
              name="autoCloseSeconds"
              value={autoClose}
              onChange={(e) => setAutoClose(e.target.value)}
              className={controlClass}
              disabled={pending}
            >
              <option value="disabled">Auto Close Disabled</option>
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
            </select>
            <span className="text-xs text-neutral-400">
              (Select time duration for auto close the alert)
            </span>
          </label>

          <div className="flex justify-center pt-2">
            <Button
              type="submit"
              disabled={pending}
              className="min-w-[8rem] bg-[#3897f0] hover:bg-[#2f86d8]"
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>

        <aside className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-sm font-medium text-neutral-600">
            {size === "small" ? "Small" : "Large"} Alert Box
          </p>
          <div
            className={cn(
              "flex gap-3 rounded-lg p-3 shadow-md",
              size === "large" ? "min-h-[140px]" : "",
            )}
            style={{
              backgroundColor: bg,
              color: tone === "light" ? "#fff" : "#111",
            }}
          >
            <div className="relative size-16 shrink-0 rounded bg-white/20">
              <span className="absolute -left-2 -top-2 flex size-5 items-center justify-center rounded-full bg-black text-[10px] text-white">
                1
              </span>
            </div>
            <div className="relative min-w-0 flex-1">
              <span className="absolute -right-1 -top-1 text-sm opacity-70">
                ×
              </span>
              <span className="absolute -left-2 top-0 flex size-5 items-center justify-center rounded-full bg-black text-[10px] text-white">
                3
              </span>
              <p className="pl-4 text-sm leading-snug">
                {text ||
                  "New Gadget Fare is live. Click here to view the products."}
                {linkLabel ? (
                  <>
                    {" "}
                    <span className="underline">{linkLabel}</span>
                  </>
                ) : null}
              </p>
              <span className="absolute -bottom-2 left-0 flex size-5 items-center justify-center rounded-full bg-black text-[10px] text-white">
                2
              </span>
            </div>
          </div>
          <div className="relative mt-3">
            <span className="absolute -left-1 top-0 flex size-5 items-center justify-center rounded-full bg-black text-[10px] text-white">
              4
            </span>
            <p className="pl-5 text-xs text-neutral-500">
              1 Image · 2 Link · 3 Text · 4 Background color
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function AdminSaleAlertSettingsPage({
  settings,
  pickableProducts,
}: {
  settings: SaleAlertSettingsView;
  pickableProducts: PickableProduct[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [minSec, setMinSec] = useState(String(settings.minIntervalSeconds));
  const [maxSec, setMaxSec] = useState(String(settings.maxIntervalSeconds));
  const [scope, setScope] = useState<SaleAlertProductScope>(
    settings.productScope,
  );
  const [manualIds, setManualIds] = useState<Set<string>>(
    new Set(settings.manualProductIds),
  );
  const [productQuery, setProductQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return pickableProducts;
    return pickableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [pickableProducts, productQuery]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveSaleAlertSettingsAction({
        enabled,
        minIntervalSeconds: Number.parseInt(minSec, 10),
        maxIntervalSeconds: Number.parseInt(maxSec, 10),
        productScope: scope,
        manualProductIds: [...manualIds],
      });
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      notifySuccess("Sale alert settings saved");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Custom Sale Alert
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Shows a real, rotating &ldquo;Someone from {"{area}"} bought{" "}
          {"{product}"}&rdquo; note, sourced from real orders — never a
          fabricated purchase, and never the customer&rsquo;s name, email, or
          phone (only their shipping area).
        </p>
      </div>
      <div className="space-y-5 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        {error ? (
          <ErrorAlert tone="danger" title="Cannot save">
            <p className="text-caption">{error}</p>
          </ErrorAlert>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-neutral-800">
            Show Custom Sale Alert
          </span>
          <AdminToggleSwitch
            label="Show custom sale alert"
            checked={enabled}
            onChange={setEnabled}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-800">
            Show Interval (Random){" "}
            <span
              className="text-[#3897f0]"
              title="Random interval between shows"
            >
              (i)
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={5}
              value={minSec}
              onChange={(e) => setMinSec(e.target.value)}
              placeholder="Min Interval Second"
              className={cn(controlClass, "max-w-[12rem]")}
              disabled={pending}
            />
            <span className="text-sm text-neutral-500">To</span>
            <Input
              type="number"
              min={5}
              value={maxSec}
              onChange={(e) => setMaxSec(e.target.value)}
              placeholder="Max Interval Second"
              className={cn(controlClass, "max-w-[12rem]")}
              disabled={pending}
            />
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-neutral-800">
            Products
          </span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as SaleAlertProductScope)}
            className={controlClass}
            disabled={pending}
          >
            <option value="featured">Featured products</option>
            <option value="sale">On-sale products</option>
            <option value="manual">Manually pick specific products</option>
          </select>
        </label>

        {scope === "manual" ? (
          <div className="space-y-2 rounded-md border border-neutral-200 p-3">
            <Input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Search products…"
              className={controlClass}
              disabled={pending}
            />
            <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-100">
              {filteredProducts.length === 0 ? (
                <p className="p-3 text-sm text-neutral-400">
                  No products match.
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 border-b border-neutral-50 px-3 py-2 text-sm last:border-b-0 hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={manualIds.has(product.id)}
                      disabled={pending}
                      onChange={() => {
                        setManualIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(product.id)) next.delete(product.id);
                          else next.add(product.id);
                          return next;
                        });
                      }}
                      className="size-4 rounded border-neutral-300"
                    />
                    <span className="flex-1">{product.name}</span>
                    <span className="text-xs text-neutral-400">
                      {product.sku}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-neutral-400">
              {manualIds.size} product{manualIds.size === 1 ? "" : "s"}{" "}
              selected.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={pending}
            className="min-w-[6.5rem] bg-[#3897f0] hover:bg-[#2f86d8]"
            onClick={handleSave}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

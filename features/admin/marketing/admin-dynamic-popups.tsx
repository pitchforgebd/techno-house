"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronDown, ImageIcon, Lock, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
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
  bulkDeletePopupsAction,
  bulkSetPopupsEnabledAction,
  savePopupAction,
  setPopupEnabledAction,
} from "@/features/admin/marketing/popup-actions";
import type { AdminPopup } from "@/lib/marketing/popups";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminDynamicPopupsPage({ rows }: { rows: AdminPopup[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuId, setMenuId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        (row.link ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  function toggleEnabled(row: AdminPopup, checked: boolean) {
    startTransition(async () => {
      const result = await setPopupEnabledAction({ id: row.id, enabled: checked });
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
          ? await bulkDeletePopupsAction({ ids })
          : await bulkSetPopupsEnabledAction({ ids, enabled: value === "enable" });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(`Updated ${result.count} popup${result.count === 1 ? "" : "s"}.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function deleteOne(id: string) {
    startTransition(async () => {
      const result = await bulkDeletePopupsAction({ ids: [id] });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Popup deleted");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Dynamic Popups
        </h1>
        <Link
          href="/admin/marketing/popups/new"
          className="inline-flex items-center rounded-full bg-[#6c5ce7] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#5b4bd6]"
        >
          Create New Dynamic Popup
        </Link>
      </div>

      <p className="text-sm text-neutral-500">
        Only the first enabled popup (by position, then oldest) shows to a
        visitor, once per browser session.
      </p>

      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-900">
            All Dynamic Popups
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
                  notifyError("Select at least one popup first");
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type name & Enter."
                className={cn(controlClass, "w-48 pl-9 sm:w-56")}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-400">
            No dynamic popups yet.
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
                    Title
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Link
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Status
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
                        aria-label={`Select ${row.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      {row.isLocked ? (
                        <Lock className="size-3.5 text-neutral-400" aria-hidden />
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
                          <ImageIcon className="size-4" aria-hidden />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-neutral-900">
                      {row.title}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {row.link ?? "—"}
                    </TableCell>
                    <TableCell>
                      <AdminToggleSwitch
                        label={`Status for ${row.title}`}
                        checked={row.enabled}
                        onChange={(checked) => toggleEnabled(row, checked)}
                      />
                    </TableCell>
                    <TableCell className="relative">
                      <button
                        type="button"
                        aria-label={`Actions for ${row.title}`}
                        onClick={() =>
                          setMenuId((id) => (id === row.id ? null : row.id))
                        }
                        className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                      {menuId === row.id ? (
                        <div className="absolute right-2 z-20 mt-1 min-w-[7rem] rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                          <Link
                            href={`/admin/marketing/popups/${row.id}`}
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

export function AdminDynamicPopupForm({ initial }: { initial?: AdminPopup | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [buttonText, setButtonText] = useState(initial?.buttonText ?? "");
  const [buttonColor, setButtonColor] = useState(initial?.buttonColor ?? "#eab308");
  const [textTone, setTextTone] = useState<"light" | "dark">(
    initial?.buttonTextTone ?? "dark",
  );
  const [link, setLink] = useState(initial?.link ?? "");
  const [delaySeconds, setDelaySeconds] = useState(String(initial?.delaySeconds ?? 3));
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
      const result = await savePopupAction(formData);
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      notifySuccess(initial ? "Dynamic popup saved" : "Dynamic popup created");
      router.push("/admin/marketing/popups");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Custom Dynamic Popup Information
        </h1>
        <Link
          href="/admin/marketing/popups"
          className="text-sm font-medium text-[#3897f0] hover:underline"
        >
          ← Back to popups
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          ref={formRef}
          className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          {error ? (
            <Alert tone="danger" title="Cannot save">
              <p className="text-caption">{error}</p>
            </Alert>
          ) : null}

          <Field label="Title" hint="(Best within 50 character)" required>
            <Input
              name="title"
              value={title}
              maxLength={50}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Type your text here"
              className={controlClass}
              required
              disabled={pending}
            />
          </Field>
          <Field label="Summary" hint="(Best within 200 character)" required>
            <textarea
              name="summary"
              value={summary}
              maxLength={200}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Type your text here"
              rows={4}
              className={cn(controlClass, "h-auto py-2")}
              required
              disabled={pending}
            />
          </Field>
          <Field label="Image" hint="(512px × 280px)">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 text-sm">
              <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium">
                Browse
              </span>
              <span className="truncate text-neutral-400">
                {fileName ?? (initial?.imagePath ? "Replace image" : "Choose File")}
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
          </Field>
          <Field label="Button Text" hint="(Best within 30 character)">
            <Input
              name="buttonText"
              value={buttonText}
              maxLength={30}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Type your text here"
              className={controlClass}
              disabled={pending}
            />
          </Field>
          <Field label="Select Button Color">
            <div className="flex items-center gap-2">
              <Input
                name="buttonColor"
                value={buttonColor}
                onChange={(e) => setButtonColor(e.target.value)}
                className={controlClass}
                disabled={pending}
              />
              <input
                type="color"
                value={buttonColor}
                onChange={(e) => setButtonColor(e.target.value)}
                className="size-10 cursor-pointer rounded border border-neutral-200"
                aria-label="Button color"
                disabled={pending}
              />
            </div>
          </Field>
          <Field label="Button Text Color">
            <div className="flex gap-4">
              {(["light", "dark"] as const).map((tone) => (
                <label key={tone} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="buttonTextTone"
                    value={tone}
                    checked={textTone === tone}
                    onChange={() => setTextTone(tone)}
                    disabled={pending}
                  />
                  <span className="capitalize">{tone}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Link">
            <Input
              name="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
              className={controlClass}
              disabled={pending}
            />
          </Field>
          <Field
            label="Delay before showing (seconds)"
            hint="How long a visitor waits before the popup appears"
          >
            <Input
              name="delaySeconds"
              type="number"
              min={0}
              max={120}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              className={controlClass}
              disabled={pending}
            />
          </Field>
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={pending}
              className="min-w-[7rem] bg-[#3897f0] hover:bg-[#2f86d8]"
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>

        <aside className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-sm font-medium text-neutral-600">Preview</p>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-md">
            <div className="relative aspect-[512/280] bg-gradient-to-br from-neutral-200 to-neutral-300">
              <span className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full bg-black/40 text-xs text-white">
                ×
              </span>
            </div>
            <div className="space-y-3 p-4">
              <h3 className="text-base font-semibold text-neutral-900">
                {title || "Popup title"}
              </h3>
              <p className="text-sm text-neutral-600">
                {summary || "Popup summary appears here."}
              </p>
              <button
                type="button"
                className="w-full rounded-md py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: buttonColor,
                  color: textTone === "light" ? "#fff" : "#111",
                }}
              >
                {buttonText || "Visit Now →"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-neutral-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {hint ? <span className="block text-xs text-neutral-400">{hint}</span> : null}
      {children}
    </label>
  );
}

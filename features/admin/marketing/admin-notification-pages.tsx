"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Frown, Lock, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  bulkSetNotificationTypesEnabledAction,
  deleteCustomNotificationsAction,
  saveNotificationSettingsAction,
  saveNotificationTypeAction,
  sendCustomNotificationAction,
  setNotificationTypeEnabledAction,
} from "@/features/admin/notifications/notification-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import type { CustomNotificationHistoryRow } from "@/lib/admin/engagement-mock";
import type { NotificationSettingsView } from "@/lib/notifications/global-settings";
import type {
  NotificationAudience,
  NotificationTypeRow,
} from "@/lib/notifications/type-settings";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const SUBNAV = [
  { href: "/admin/notifications/types", label: "Types" },
  { href: "/admin/notifications/custom", label: "Send custom" },
  { href: "/admin/notifications/history", label: "History" },
  { href: "/admin/notifications/settings", label: "Settings" },
] as const;

function NotificationSubnav({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {SUBNAV.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            active === link.href
              ? "bg-[#3897f0] text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminNotificationTypesPage({
  types,
}: {
  types: NotificationTypeRow[];
}) {
  const router = useRouter();
  const [audience, setAudience] = useState<NotificationAudience>("customer");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState("");
  const [formText, setFormText] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = types.filter((row) => row.audience === audience);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.defaultText.toLowerCase().includes(q),
      );
    }
    return list;
  }, [types, audience, query]);

  function startEdit(row: NotificationTypeRow) {
    setEditingId(row.id);
    setFormType(row.name);
    setFormText(row.defaultText);
  }

  function handleSave() {
    if (!formType.trim() || !formText.trim()) {
      notifyError("Type and default text are required");
      return;
    }
    startTransition(async () => {
      const result = await saveNotificationTypeAction({
        id: editingId ?? undefined,
        name: formType.trim(),
        defaultText: formText.trim(),
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(editingId ? "Notification type updated" : "Notification type created");
      setEditingId(null);
      setFormType("");
      setFormText("");
      router.refresh();
    });
  }

  function toggleEnabled(row: NotificationTypeRow, checked: boolean) {
    startTransition(async () => {
      const result = await setNotificationTypeEnabledAction({
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
      const result = await bulkSetNotificationTypesEnabledAction({
        ids,
        enabled: value === "enable",
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(`Updated ${result.count} type${result.count === 1 ? "" : "s"}.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          All Notification Types
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Default notification types can not be deleted.
        </p>
      </div>
      <NotificationSubnav active="/admin/notifications/types" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-5">
            <div className="flex gap-1 rounded-full bg-neutral-100 p-1">
              {(["customer", "admin"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAudience(tab)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium capitalize",
                    audience === tab
                      ? "bg-sky-100 text-[#3897f0]"
                      : "text-neutral-600 hover:text-neutral-900",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Bulk action"
                className={cn(controlClass, "w-auto min-w-[8rem]")}
                defaultValue=""
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.value = "";
                  if (!value) return;
                  if (selected.size === 0) {
                    notifyError("Select at least one type first");
                    return;
                  }
                  runBulkAction(value);
                }}
              >
                <option value="">Bulk Action</option>
                <option value="enable">Enable</option>
                <option value="disable">Disable</option>
              </select>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type & Enter"
                  className={cn(controlClass, "w-40 pl-9 sm:w-48")}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeader className="w-10" />
                  <TableHeader className="w-8" />
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Type
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Default text
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Status
                  </TableHeader>
                  <TableHeader className="w-12 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Actions
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className={
                      editingId === row.id ? "bg-sky-50/50" : undefined
                    }
                  >
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
                        aria-label={`Select ${row.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      {row.isLocked ? (
                        <Lock className="size-3.5 text-neutral-400" />
                      ) : null}
                    </TableCell>
                    <TableCell className="font-semibold text-neutral-900">
                      {row.name}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-neutral-600">
                      {row.defaultText}
                    </TableCell>
                    <TableCell>
                      <AdminToggleSwitch
                        label={`Enable ${row.name}`}
                        checked={row.enabled}
                        onChange={(checked) => toggleEnabled(row, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        aria-label={`Edit ${row.name}`}
                        className="inline-flex size-8 items-center justify-center rounded-md bg-sky-100 text-[#3897f0] hover:bg-sky-200"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <aside className="h-fit rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">
            {editingId ? "Edit Notification Type" : "Add New Notification Type"}
          </h2>
          <div className="mt-4 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">
                Type <span className="text-red-500">*</span>
              </span>
              <Input
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                placeholder="Notification Type"
                className={controlClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">
                Default Text <span className="text-red-500">*</span>
              </span>
              <span className="block text-xs text-neutral-400">
                (Best within 80 character)
              </span>
              <Textarea
                value={formText}
                maxLength={80}
                onChange={(e) => setFormText(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              />
              <p className="text-xs font-medium text-red-500">
                ** N.B : Use character, number only **
              </p>
            </label>
            <div className="flex justify-end gap-2">
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setEditingId(null);
                    setFormType("");
                    setFormText("");
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={pending}
                className="bg-[#3897f0] hover:bg-[#2f86d8]"
                onClick={handleSave}
              >
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function AdminCustomNotificationsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState("");
  const [type, setType] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Send Custom Notification
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Creates in-app inbox rows. Email and SMS are not sent.
        </p>
      </div>
      <NotificationSubnav active="/admin/notifications/custom" />

      {formError ? (
        <Alert tone="danger" title="Could not send">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      <form
        className="space-y-5 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setFormError(null);
          startTransition(async () => {
            const result = await sendCustomNotificationAction({
              audience: customers,
              type,
              content,
              link,
            });
            if (!result.ok) {
              setFormError(result.formError);
              return;
            }
            notifySuccess(
              result.count === 1
                ? "Notification sent"
                : `Notification sent to ${result.count} customers`,
            );
            setContent("");
            setLink("");
            router.refresh();
          });
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Customers</span>
          <Select
            value={customers}
            onChange={(e) => setCustomers(e.target.value)}
            className={controlClass}
          >
            <option value="">Nothing selected</option>
            <option value="all">All customers</option>
            <option value="verified">Verified customers</option>
            <option value="recent">Recent buyers</option>
          </Select>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCustomers("all")}
              className="rounded-md bg-sky-50 px-3 py-1 text-xs font-medium text-[#3897f0] hover:bg-sky-100"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setCustomers("")}
              className="rounded-md bg-sky-50 px-3 py-1 text-xs font-medium text-[#3897f0] hover:bg-sky-100"
            >
              Deselect All
            </button>
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Select Type</span>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={controlClass}
          >
            <option value="">Select the type of the notification</option>
            <option value="promo">Promotion</option>
            <option value="info">Information</option>
            <option value="alert">Alert</option>
          </Select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Content</span>
          <span className="block text-xs text-neutral-400">
            (Best within 80 character)
          </span>
          <Textarea
            value={content}
            maxLength={80}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write what your notification will display..."
            rows={4}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Link</span>
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Paste your link here"
            className={controlClass}
          />
        </label>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            className="bg-[#3897f0] shadow-[0_0_0_3px_rgba(56,151,240,0.25)] hover:bg-[#2f86d8]"
          >
            {pending ? "Sending…" : "Send Notifications"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function AdminNotificationHistoryPage({
  items,
}: {
  items: CustomNotificationHistoryRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function handleDelete(ids: string[]) {
    startTransition(async () => {
      const result = await deleteCustomNotificationsAction({ ids });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        result.count === 1
          ? "Notification deleted"
          : `${result.count} notifications deleted`,
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Custom Notification History
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Default system notifications doesn&apos;t show in custom notification
          history
        </p>
      </div>
      <NotificationSubnav active="/admin/notifications/history" />

      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex justify-end border-b border-neutral-100 px-4 py-3 sm:px-5">
          <select
            aria-label="Bulk action"
            className={cn(controlClass, "w-auto min-w-[8.5rem]")}
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              if (selected.size === 0) {
                notifyError("Select at least one row first");
              } else if (e.target.value === "delete") {
                handleDelete([...selected]);
              }
              e.target.value = "";
            }}
            disabled={pending}
          >
            <option value="">Bulk Action</option>
            <option value="delete">Delete</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeader className="w-10" />
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Type
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Date &amp; Time
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Notification
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Link
                </TableHeader>
                <TableHeader className="text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Actions
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-neutral-400">
                      <Frown className="size-12 opacity-40" aria-hidden />
                      <p className="text-sm">Nothing found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          });
                        }}
                        className="size-4 rounded border-neutral-300"
                        aria-label={`Select ${row.id}`}
                      />
                    </TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.dateTime}</TableCell>
                    <TableCell>{row.notification}</TableCell>
                    <TableCell>{row.link}</TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        disabled={pending}
                        className="text-sm text-red-500 hover:underline disabled:opacity-50"
                        onClick={() => handleDelete([row.id])}
                      >
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

export function AdminNotificationSettingsPage({
  settings,
}: {
  settings: NotificationSettingsView;
}) {
  const router = useRouter();
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled);
  const [smsEnabled, setSmsEnabled] = useState(settings.smsEnabled);
  const [pushEnabled, setPushEnabled] = useState(settings.pushEnabled);
  const [fromName, setFromName] = useState(settings.fromName);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveNotificationSettingsAction({
        emailEnabled,
        smsEnabled,
        pushEnabled,
        fromName,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Notification settings saved");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Notification settings
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Global defaults for customer messaging channels
        </p>
      </div>
      <NotificationSubnav active="/admin/notifications/settings" />
      <section className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-800">Email</span>
          <AdminToggleSwitch
            label="Enable email notifications"
            checked={emailEnabled}
            onChange={setEmailEnabled}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-800">SMS</span>
          <AdminToggleSwitch
            label="Enable SMS notifications"
            checked={smsEnabled}
            onChange={setSmsEnabled}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-800">Push</span>
          <AdminToggleSwitch
            label="Enable push notifications"
            checked={pushEnabled}
            onChange={setPushEnabled}
          />
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-700">
            From name
          </span>
          <Input
            value={fromName}
            onChange={(event) => setFromName(event.target.value)}
            className={controlClass}
          />
        </label>
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={pending}
            className="bg-[#3897f0] hover:bg-[#2f86d8]"
            onClick={handleSave}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </section>
    </div>
  );
}

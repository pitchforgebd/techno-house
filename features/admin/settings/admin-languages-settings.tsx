"use client";

import { Eye, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import {
  AdminToggleSwitch,
  BlueSave,
  FieldRow,
  PurpleAdd,
  Select,
  SetupCard,
  controlClass,
  notifySuccess,
} from "@/features/admin/settings/setup-ui";
import { notifyError } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveLanguageSettingsAction } from "@/features/admin/settings/language-actions";
import type { AdminLanguageRow } from "@/lib/business/language-config";

export function AdminLanguagesSettings({
  initial,
}: {
  initial: AdminLanguageRow[];
}) {
  const [defaultLang, setDefaultLang] = useState(
    initial.find((l) => l.isDefault)?.code ?? "en",
  );
  const [items, setItems] = useState<AdminLanguageRow[]>(initial);
  const [pending, startTransition] = useTransition();

  function setRtl(code: string, rtl: boolean) {
    setItems((current) =>
      current.map((item) => (item.code === code ? { ...item, rtl } : item)),
    );
  }

  function setStatus(code: string, enabled: boolean) {
    setItems((current) =>
      current.map((item) => (item.code === code ? { ...item, enabled } : item)),
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveLanguageSettingsAction({
        defaultCode: defaultLang,
        languages: items.map((item) => ({
          code: item.code,
          enabled: item.enabled,
          rtl: item.rtl,
        })),
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess("Language settings saved");
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Languages
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage storefront locales and translation imports.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SetupCard
          title="Default Language"
          hint="Saves default language plus each row's status/RTL below."
          footer={
            <div className="flex justify-end px-5 pb-5">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="rounded-lg bg-[#6c5ce7] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5b4bd4] disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          }
        >
          <FieldRow label="Default language">
            <Select
              className={controlClass}
              value={defaultLang}
              onChange={(e) => setDefaultLang(e.target.value)}
              disabled={pending}
            >
              {items.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </Select>
          </FieldRow>
        </SetupCard>

        <SetupCard title="Import Translations">
          <label className="flex h-10 cursor-pointer items-center overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
            <span className="bg-neutral-100 px-3 py-2 font-medium text-neutral-700">
              Browse
            </span>
            <span className="truncate px-3 text-neutral-400">Choose File</span>
            <input type="file" className="sr-only" accept=".json,.csv" />
          </label>
          <div className="flex justify-end">
            <BlueSave
              label="Import"
              onClick={() =>
                notifyError("Translation import isn't available yet.")
              }
            />
          </div>
        </SetupCard>

        <section className="rounded-xl border border-sky-100 bg-sky-50/80 p-5 text-sm text-sky-900">
          <h2 className="font-semibold text-sky-950">Instructions</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sky-800/90">
            <li>English is the v1 default storefront language.</li>
            <li>Enable Bangla when translations are ready.</li>
            <li>
              Status and default language are live below. The default
              language&apos;s RTL setting sets the real page direction
              (<code>dir=&quot;rtl&quot;</code>) site-wide — translated content
              itself is still not wired, since there is nowhere for
              translated strings to live yet.
            </li>
          </ul>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            All Languages
          </h2>
          <PurpleAdd
            onClick={() =>
              notifyError("Adding new languages isn't available yet.")
            }
          />
        </div>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader className="w-12">#</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Code</TableHeader>
              <TableHeader>RTL</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader className="text-right">Options</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((lang, index) => (
              <TableRow key={lang.code}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{lang.label}</TableCell>
                <TableCell className="font-mono text-sm">{lang.code}</TableCell>
                <TableCell>
                  <AdminToggleSwitch
                    label={`RTL for ${lang.label}`}
                    checked={lang.rtl}
                    onChange={(checked) => setRtl(lang.code, checked)}
                    disabled={pending}
                  />
                </TableCell>
                <TableCell>
                  <AdminToggleSwitch
                    label={`Status for ${lang.label}`}
                    checked={lang.enabled}
                    onChange={(checked) => setStatus(lang.code, checked)}
                    activeClassName="bg-emerald-500"
                    disabled={pending || lang.code === defaultLang}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50"
                      aria-label={`View ${lang.label}`}
                      onClick={() =>
                        notifyError("Language detail view isn't available yet.")
                      }
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50"
                      aria-label={`Edit ${lang.label}`}
                      onClick={() =>
                        notifyError("Language editing isn't available yet.")
                      }
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

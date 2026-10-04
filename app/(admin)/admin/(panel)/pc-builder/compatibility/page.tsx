import type { Metadata } from "next";
import { AdminPcBuilderCompatibility } from "@/features/admin/pc-builder/admin-pc-builder-compatibility";
import {
  COMPATIBILITY_SLOTS,
  isCompatibilitySlot,
  loadCompatibilityCoverage,
  loadCompatibilityProducts,
  type CompatibilityStatusFilter,
} from "@/lib/pc-builder/admin-compatibility";

export const metadata: Metadata = {
  title: "PC Builder — Compatibility data",
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminPcBuilderCompatibilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const coverage = await loadCompatibilityCoverage();

  const requestedSlot = first(params.slot);
  const slot = isCompatibilitySlot(requestedSlot)
    ? requestedSlot
    : (coverage.find((row) => row.ready < row.total)?.slot ??
      COMPATIBILITY_SLOTS[0]!.id);
  const statusParam = first(params.status);
  const status: CompatibilityStatusFilter =
    statusParam === "ready" || statusParam === "all" ? statusParam : "missing";
  const q = first(params.q).trim().slice(0, 80);
  const page = Number.parseInt(first(params.page), 10) || 1;

  const list = await loadCompatibilityProducts({ slot, status, q, page });

  return (
    <AdminPcBuilderCompatibility
      key={`${slot}|${status}|${q}|${list.page}`}
      coverage={coverage}
      slot={slot}
      status={status}
      q={q}
      list={list}
    />
  );
}

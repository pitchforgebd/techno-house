/**
 * Real admin view of customer-saved PC builds (AD-275). The storefront save
 * flow (lib/pc-builder/saved-builds.ts) already writes real `PCBuild` rows —
 * this reads the same table, it doesn't introduce a second source of truth.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { publicOrigin } from "@/lib/seo/public-origin";
import { usesDatabase } from "@/lib/runtime/data-source";

export type AdminPcBuilderBuildStatus = "draft" | "saved" | "shared";

export type AdminPcBuilderBuild = {
  id: string;
  name: string;
  ownerLabel: string;
  componentsCount: number;
  shareLink: string;
  featured: boolean;
  status: AdminPcBuilderBuildStatus;
  updatedAt: string;
};

const STATUS_MAP: Record<string, AdminPcBuilderBuildStatus> = {
  DRAFT: "draft",
  SAVED: "saved",
  SHARED: "shared",
};

export async function getAdminPcBuilderBuilds(): Promise<AdminPcBuilderBuild[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().pCBuild.findMany({
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      status: true,
      shareSlug: true,
      isFeatured: true,
      updatedAt: true,
      user: { select: { fullName: true, email: true } },
      _count: { select: { items: true } },
    },
  });

  const origin = publicOrigin();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ownerLabel: row.user
      ? `${row.user.fullName} (customer)`
      : "Guest (not signed in)",
    componentsCount: row._count.items,
    shareLink: row.shareSlug ? `${origin}/pc-builder/share/${row.shareSlug}` : "",
    featured: row.isFeatured,
    status: STATUS_MAP[row.status] ?? "draft",
    updatedAt: row.updatedAt.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }),
  }));
}

export type PcBuildMutationResult = { ok: true } | { ok: false; formError: string };

export async function setPcBuildFeatured(input: {
  id: string;
  featured: boolean;
  actor?: { staffId: string; email: string; ip?: string | null };
}): Promise<PcBuildMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "PC Builder needs the database. Turn off DATA_SOURCE=mock." };
  }
  const prisma = getPrisma();
  const existing = await prisma.pCBuild.findUnique({
    where: { id: input.id },
    select: { id: true, name: true },
  });
  if (!existing) {
    return { ok: false, formError: "That build no longer exists." };
  }
  await prisma.pCBuild.update({
    where: { id: input.id },
    data: { isFeatured: input.featured },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.PC_BUILD_FEATURE,
      entityType: "PCBuild",
      entityId: existing.id,
      ip: input.actor.ip,
      metadata: { name: existing.name, featured: input.featured },
    });
  }
  return { ok: true };
}

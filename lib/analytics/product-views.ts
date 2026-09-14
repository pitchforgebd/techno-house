/**
 * Real product page-view tracking (AD-258) behind the "N people are
 * viewing this" PDP widget. A rolling window table, not an analytics
 * warehouse — pruned opportunistically on write.
 */
import { getPrisma } from "@/lib/db/prisma";

const PRUNE_PROBABILITY = 0.05;
const PRUNE_OLDER_THAN_MS = 1000 * 60 * 60 * 24;

export async function recordProductView(input: {
  productSlug: string;
  viewerKey: string;
}): Promise<void> {
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { slug: input.productSlug },
    select: { id: true },
  });
  if (!product) {
    return;
  }
  await prisma.productViewEvent.create({
    data: { productId: product.id, viewerKey: input.viewerKey },
  });
  if (Math.random() < PRUNE_PROBABILITY) {
    await prisma.productViewEvent.deleteMany({
      where: { viewedAt: { lt: new Date(Date.now() - PRUNE_OLDER_THAN_MS) } },
    });
  }
}

export async function getLiveViewerCount(
  productSlug: string,
  windowMinutes: number,
): Promise<number> {
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: { id: true },
  });
  if (!product) {
    return 0;
  }
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
  const rows = await prisma.productViewEvent.findMany({
    where: { productId: product.id, viewedAt: { gte: cutoff } },
    distinct: ["viewerKey"],
    select: { viewerKey: true },
  });
  return rows.length;
}

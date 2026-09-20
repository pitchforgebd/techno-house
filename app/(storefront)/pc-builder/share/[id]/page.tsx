import type { Metadata } from "next";
import { PcBuilderShareView } from "@/features/pc-builder/pc-builder-share-view";
import { getPublicSharedBuild } from "@/lib/pc-builder/share";
import { validateBuild } from "@/lib/pc-builder/validate-build";

export const metadata: Metadata = {
  title: "Shared build — Techno House",
  description: "View a shared PC Builder configuration.",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PcBuilderSharePage({ params }: PageProps) {
  const { id } = await params;
  const shared = await getPublicSharedBuild(id);
  const snapshot = shared ? await validateBuild(shared.selection) : null;

  return (
    <PcBuilderShareView
      id={id}
      name={shared?.name ?? null}
      selection={shared?.selection ?? {}}
      valid={shared !== null}
      products={snapshot?.products ?? []}
      pricing={
        snapshot?.pricing ?? {
          subtotal: 0,
          pricedCount: 0,
          missingPriceCount: 0,
        }
      }
      issues={snapshot?.issues ?? []}
    />
  );
}

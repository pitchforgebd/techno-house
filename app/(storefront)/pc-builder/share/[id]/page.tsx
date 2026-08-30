import type { Metadata } from "next";
import { PcBuilderShareView } from "@/features/pc-builder/pc-builder-share-view";
import { decodeShareId } from "@/lib/domain/pc-builder";

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
  const selection = decodeShareId(id);
  const valid = selection !== null;

  return <PcBuilderShareView selection={selection ?? {}} valid={valid} />;
}

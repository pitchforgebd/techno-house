import type { Metadata } from "next";
import { AccountOrderDetailView } from "@/features/account/account-order-detail-view";

export const metadata: Metadata = {
  title: "Order — Techno House",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AccountOrderDetailView orderId={id} />;
}

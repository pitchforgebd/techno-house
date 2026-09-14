import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountAddressesView } from "@/features/account/account-addresses-view";
import { listCustomerAddresses } from "@/lib/account/addresses";
import { getCustomerSession } from "@/lib/auth/customer-session";

export const metadata: Metadata = {
  title: "Delivery addresses — Techno House",
  robots: { index: false, follow: false },
};

export default async function B2BAddressesPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const addresses = await listCustomerAddresses();
  return <AccountAddressesView addresses={addresses} />;
}

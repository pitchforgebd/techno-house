import type { Metadata } from "next";
import { AccountAddressesView } from "@/features/account/account-addresses-view";
import { listCustomerAddresses } from "@/lib/account/addresses";

export const metadata: Metadata = {
  title: "Addresses — Techno House",
};

export default async function AccountAddressesPage() {
  const addresses = await listCustomerAddresses();
  return <AccountAddressesView addresses={addresses} />;
}

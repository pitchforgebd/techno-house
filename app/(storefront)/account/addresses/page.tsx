import type { Metadata } from "next";
import { AccountComingSoon } from "@/features/account/account-coming-soon";

export const metadata: Metadata = {
  title: "Addresses — Techno House",
};

export default function AccountAddressesPage() {
  return (
    <AccountComingSoon
      title="Addresses"
      description="Saved delivery addresses wait for customer accounts on the server. Checkout still collects an address per mock order."
    />
  );
}

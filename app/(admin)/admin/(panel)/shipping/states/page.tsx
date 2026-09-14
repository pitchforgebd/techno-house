import { redirect } from "next/navigation";

/**
 * Countries/States/Cities never mapped to real shipping calculation
 * (checkout only ever resolves via Method + Zone + Area — see
 * lib/shipping/resolve.ts) and Bangladesh is single-country, so this page
 * is consolidated into Shipping Zones rather than kept as a disconnected
 * mock CRUD (AD-252).
 */
export default function AdminShippingStatesPage() {
  redirect("/admin/shipping/zones");
}

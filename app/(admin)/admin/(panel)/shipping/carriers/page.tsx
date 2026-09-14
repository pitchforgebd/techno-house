import { redirect } from "next/navigation";

/**
 * "Carriers" (Pathao/Steadfast/Manual) duplicated the concept already
 * covered by real Shipping Methods (name, rate, zones, isPickup — see
 * lib/shipping/methods.ts). Consolidated there rather than kept as a
 * disconnected mock CRUD (AD-252).
 */
export default function AdminShippingCarriersPage() {
  redirect("/admin/shipping");
}

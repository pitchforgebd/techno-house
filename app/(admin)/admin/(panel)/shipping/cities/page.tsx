import { redirect } from "next/navigation";

/**
 * Countries/States/Cities never mapped to real shipping calculation
 * (checkout only ever resolves via Method + Zone + Area — see
 * lib/shipping/resolve.ts). Cities is consolidated into Shipping Areas,
 * the real fine-grained location list, rather than kept as a
 * disconnected mock CRUD (AD-252).
 */
export default function AdminShippingCitiesPage() {
  redirect("/admin/shipping/areas");
}

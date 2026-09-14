import type { Metadata } from "next";
import { AdminOrderList } from "@/features/admin/orders/admin-order-list";
import { loadAdminOrderList } from "@/lib/admin/load-orders";
import {
  parseAdminOrderListParams,
  type AdminOrderSearchParams,
} from "@/lib/admin/order-list-params";
import { listEnabledCouriers } from "@/lib/shipping/courier-settings";

export const metadata: Metadata = {
  title: "Orders",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<AdminOrderSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseAdminOrderListParams(raw);
  const [data, couriers] = await Promise.all([
    loadAdminOrderList(params),
    listEnabledCouriers(),
  ]);
  return (
    <AdminOrderList
      data={data}
      title="All orders"
      actionPath="/admin/orders"
      couriers={couriers}
    />
  );
}

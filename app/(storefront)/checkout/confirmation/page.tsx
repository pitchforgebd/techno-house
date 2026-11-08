import type { Metadata } from "next";
import { TrackEvent } from "@/components/tracking/track-event";
import { CheckoutConfirmationView } from "@/features/checkout/checkout-confirmation-view";
import { getCustomerOrderByNumber } from "@/lib/orders/customer-orders";
import { loadPurchaseTracking } from "@/lib/tracking/purchase-server";

export const metadata: Metadata = {
  title: "Order confirmation — Techno House",
};

type PageProps = {
  searchParams: Promise<{ order?: string }>;
};

export default async function CheckoutConfirmationPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const number = typeof params.order === "string" ? params.order : "";
  const [serverOrder, purchase] = await Promise.all([
    number ? getCustomerOrderByNumber(number) : Promise.resolve(null),
    // Never let a tracking lookup break the receipt.
    number ? loadPurchaseTracking(number).catch(() => null) : Promise.resolve(null),
  ]);
  return (
    <>
      {serverOrder && purchase ? (
        // event_id = order number (the server CAPI Purchase uses the same);
        // onceKey keeps a reload or a revisit from counting a second sale.
        <TrackEvent
          name="Purchase"
          data={purchase.data}
          eventId={purchase.eventId}
          eventKey={purchase.eventId}
          onceKey={`purchase:${purchase.eventId}`}
        />
      ) : null}
      <CheckoutConfirmationView serverOrder={serverOrder} />
    </>
  );
}

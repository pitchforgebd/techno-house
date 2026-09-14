import type { Metadata } from "next";
import { CheckoutView } from "@/features/checkout/checkout-view";
import { isFeatureFlagEnabled } from "@/lib/admin/feature-flags-config";
import { getPublicOrderCharges } from "@/lib/business/operations-config";
import { listHostedGatewayAvailability } from "@/lib/payments/config";
import { getOfflinePaymentConfig } from "@/lib/payments/offline-config";
import {
  listPublicShippingAreas,
  listPublicShippingZones,
} from "@/lib/shipping/locations";
import { listPublicShippingMethods } from "@/lib/shipping/methods";
import {
  listPublicDistricts,
  listPublicUpazilas,
} from "@/lib/shipping/districts";
import { NO_INDEX } from "@/lib/seo/robots";

export const metadata: Metadata = {
  title: "Checkout — Techno House",
  robots: NO_INDEX,
};

export default async function CheckoutPage() {
  const [
    allShippingMethods,
    shippingZones,
    shippingAreas,
    districts,
    upazilas,
    gateways,
    offline,
    pickupPointEnabled,
    billingAddressEnabled,
    couponsEnabled,
    charges,
  ] = await Promise.all([
    listPublicShippingMethods(),
    listPublicShippingZones(),
    listPublicShippingAreas(),
    listPublicDistricts(),
    listPublicUpazilas(),
    listHostedGatewayAvailability(),
    getOfflinePaymentConfig(),
    isFeatureFlagEnabled("pickup-point"),
    isFeatureFlagEnabled("billing-address"),
    isFeatureFlagEnabled("coupons"),
    getPublicOrderCharges(),
  ]);
  const shippingMethods = pickupPointEnabled
    ? allShippingMethods
    : allShippingMethods.filter((method) => !method.isPickup);
  return (
    <CheckoutView
      shippingMethods={shippingMethods}
      shippingZones={shippingZones}
      shippingAreas={shippingAreas}
      districts={districts}
      upazilas={upazilas}
      gateways={gateways}
      offline={offline}
      billingAddressEnabled={billingAddressEnabled}
      couponsEnabled={couponsEnabled}
      charges={charges}
    />
  );
}

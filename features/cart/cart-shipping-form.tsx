"use client";

import Link from "next/link";
import { Field } from "@/components/ui/field";
import { Radio, RadioGroup } from "@/components/ui/radio";
import { Select } from "@/components/ui/select";
import { useCartStore } from "@/features/cart/use-cart-store";
import {
  MOCK_SHIPPING_AREAS,
  MOCK_SHIPPING_METHODS,
  MOCK_SHIPPING_ZONES,
  areasForZone,
  findShippingArea,
  findShippingMethod,
  methodsForZone,
  type ShippingArea,
  type ShippingMethod,
  type ShippingZone,
  type ShippingZoneId,
} from "@/lib/cart/shipping";
import { formatMoney } from "@/lib/format/currency";

export function CartShippingForm({
  methods: catalog = MOCK_SHIPPING_METHODS,
  zones = MOCK_SHIPPING_ZONES,
  areas: areaCatalog = MOCK_SHIPPING_AREAS,
}: {
  methods?: ShippingMethod[];
  zones?: ShippingZone[];
  areas?: ShippingArea[];
}) {
  const { state, setShipping } = useCartStore();
  const area = findShippingArea(state.shippingAreaId, areaCatalog);
  const zoneId = (area?.zoneId ?? null) as ShippingZoneId | null;
  const methods = methodsForZone(zoneId, catalog);
  const selectedMethod = findShippingMethod(state.shippingMethodId, catalog);
  const pickup =
    catalog.find((method) => method.isPickup) ?? catalog[0] ?? null;

  const areas = zoneId !== null ? areasForZone(zoneId, areaCatalog) : [];

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="text-label font-semibold text-text">Shipping</h3>
      <p className="mt-1 text-caption text-text-muted">
        Preview uses current shipping methods and areas. Final charge is set at
        checkout. See{" "}
        <Link
          href="/shipping"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          shipping info
        </Link>
        .
      </p>

      <div className="mt-3 space-y-3">
        <Field label="Delivery zone" htmlFor="cart-shipping-zone">
          <Select
            id="cart-shipping-zone"
            value={zoneId ?? ""}
            onChange={(event) => {
              const nextZone = event.target.value as ShippingZoneId | "";
              if (!nextZone) {
                setShipping({
                  methodId: pickup?.id ?? null,
                  areaId: null,
                });
                return;
              }
              const firstArea = areasForZone(nextZone, areaCatalog)[0];
              const available = methodsForZone(nextZone, catalog);
              const preferred =
                available.find((method) => !method.isPickup) ??
                available[0] ??
                null;
              setShipping({
                methodId: preferred?.id ?? null,
                areaId: firstArea?.id ?? null,
              });
            }}
          >
            <option value="">Select a zone</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        </Field>

        {zoneId ? (
          <Field label="Area" htmlFor="cart-shipping-area">
            <Select
              id="cart-shipping-area"
              value={state.shippingAreaId ?? ""}
              onChange={(event) => {
                const nextAreaId = event.target.value || null;
                const nextArea = findShippingArea(nextAreaId, areaCatalog);
                const available = methodsForZone(
                  nextArea?.zoneId ?? null,
                  catalog,
                );
                const keep =
                  selectedMethod &&
                  available.some((method) => method.id === selectedMethod.id)
                    ? selectedMethod.id
                    : (available.find((method) => !method.isPickup)?.id ??
                      available[0]?.id ??
                      null);
                setShipping({ methodId: keep, areaId: nextAreaId });
              }}
            >
              <option value="">Select an area</option>
              {areas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <RadioGroup legend="Shipping method">
          {methods.map((method) => {
            const rateLabel =
              method.baseRate === 0 || method.baseRate === null
                ? "Free"
                : formatMoney({ amount: method.baseRate });
            return (
              <div key={method.id}>
                <Radio
                  name="cart-shipping-method"
                  value={method.id}
                  label={`${method.name} · ${rateLabel}`}
                  checked={state.shippingMethodId === method.id}
                  disabled={
                    !method.isPickup &&
                    (!zoneId ||
                      (method.zoneIds.length > 0 &&
                        !method.zoneIds.includes(zoneId)))
                  }
                  onChange={() => {
                    setShipping({
                      methodId: method.id,
                      areaId: state.shippingAreaId,
                    });
                  }}
                />
                <p className="ml-6 text-caption text-text-muted">
                  {method.description}
                </p>
              </div>
            );
          })}
        </RadioGroup>

        {!zoneId && !selectedMethod?.isPickup ? (
          <p className="text-caption text-text-muted">
            Choose a zone and area for home delivery or courier, or select store
            pickup.
          </p>
        ) : null}
      </div>
    </div>
  );
}

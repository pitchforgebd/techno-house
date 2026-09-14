"use client";

import { useEffect, useState, useTransition } from "react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  getPathaoAreasAction,
  getPathaoCitiesAction,
  getPathaoZonesAction,
  sendOrderToPathaoAction,
} from "@/features/admin/shipping/courier-actions";

type Loc = { id: number; name: string };

export function SendToPathaoModal({
  orderId,
  orderNumber,
  onClose,
  onSent,
}: {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [cities, setCities] = useState<Loc[]>([]);
  const [zones, setZones] = useState<Loc[]>([]);
  const [areas, setAreas] = useState<Loc[]>([]);
  const [cityId, setCityId] = useState<number | null>(null);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [pending, startTransition] = useTransition();

  /**
   * Picking a city invalidates the zone and area beneath it, so those are
   * cleared here — in the event that caused it — rather than in an effect
   * reacting to it afterwards.
   */
  function selectCity(next: number | null): void {
    setCityId(next);
    setZones([]);
    setZoneId(null);
    setAreas([]);
    setAreaId(null);
    // Raised here too: the spinner starts because the user picked a city, not
    // because an effect later noticed that they had.
    setLoadingZones(next != null);
    setLoadingAreas(false);
  }

  function selectZone(next: number | null): void {
    setZoneId(next);
    setAreas([]);
    setAreaId(null);
    setLoadingAreas(next != null);
  }

  useEffect(() => {
    // `loadingCities` already initialises to true and this runs once on mount,
    // so setting it again here was redundant.
    let cancelled = false;
    getPathaoCitiesAction().then((result) => {
      if (cancelled) return;
      setLoadingCities(false);
      if (!result.ok) {
        notifyError(result.reason);
        return;
      }
      setCities(result.locations);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch only. Clearing the downstream selections belongs to `selectCity`,
  // the event that actually invalidates them — resetting them here instead
  // made this effect set state synchronously on every city change, which is
  // both an extra render pass and the thing `react-hooks/set-state-in-effect`
  // warns about.
  useEffect(() => {
    if (cityId == null) {
      return;
    }
    let cancelled = false;
    getPathaoZonesAction({ cityId }).then((result) => {
      if (cancelled) return;
      setLoadingZones(false);
      if (!result.ok) {
        notifyError(result.reason);
        return;
      }
      setZones(result.locations);
    });
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  useEffect(() => {
    if (zoneId == null) {
      return;
    }
    let cancelled = false;
    getPathaoAreasAction({ zoneId }).then((result) => {
      if (cancelled) return;
      setLoadingAreas(false);
      if (!result.ok) {
        notifyError(result.reason);
        return;
      }
      setAreas(result.locations);
    });
    return () => {
      cancelled = true;
    };
  }, [zoneId]);

  function send() {
    if (cityId == null || zoneId == null || areaId == null) {
      notifyError("Choose city, zone, and area first.");
      return;
    }
    startTransition(async () => {
      const result = await sendOrderToPathaoAction({
        orderId,
        cityId,
        zoneId,
        areaId,
      });
      if (!result.ok) {
        notifyError(result.reason);
        return;
      }
      notifySuccess(`Sent to Pathao — tracking ${result.trackingCode}`);
      onSent();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-neutral-900">
          Send {orderNumber} to Pathao
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Pathao needs the recipient&apos;s city/zone/area from their own
          list — pick the closest match.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-neutral-600">City</span>
            <Select
              value={cityId ?? ""}
              onChange={(e) => selectCity(Number(e.target.value) || null)}
              disabled={loadingCities || pending}
            >
              <option value="">
                {loadingCities ? "Loading…" : "Select city"}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-neutral-600">Zone</span>
            <Select
              value={zoneId ?? ""}
              onChange={(e) => selectZone(Number(e.target.value) || null)}
              disabled={cityId == null || loadingZones || pending}
            >
              <option value="">
                {loadingZones ? "Loading…" : "Select zone"}
              </option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-neutral-600">Area</span>
            <Select
              value={areaId ?? ""}
              onChange={(e) => setAreaId(Number(e.target.value) || null)}
              disabled={zoneId == null || loadingAreas || pending}
            >
              <option value="">
                {loadingAreas ? "Loading…" : "Select area"}
              </option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={send}
            disabled={pending || areaId == null}
          >
            {pending ? "Sending…" : "Send to Pathao"}
          </Button>
        </div>
      </div>
    </div>
  );
}

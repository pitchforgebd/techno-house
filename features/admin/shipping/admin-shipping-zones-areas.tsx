"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  saveShippingAreaAction,
  saveShippingZoneAction,
} from "@/features/admin/shipping/shipping-actions";
import {
  AdminToggleSwitch,
  BlueSave,
  SetupBackLink,
} from "@/features/admin/settings/setup-ui";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { Input } from "@/components/ui/input";
import type {
  AdminShippingArea,
  AdminShippingZone,
} from "@/lib/shipping/locations";

const controlClass =
  "h-9 w-full max-w-xs appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function ZoneRow({ zone }: { zone: AdminShippingZone }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [isActive, setIsActive] = useState(zone.isActive);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="align-top font-mono text-xs text-neutral-500">
        {zone.code}
      </TableCell>
      <TableCell className="align-top">
        <Input
          className={controlClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={`Name for ${zone.code}`}
        />
        {formError ? (
          <p className="mt-1 text-xs text-red-600">{formError}</p>
        ) : null}
      </TableCell>
      <TableCell className="align-top tabular-nums text-neutral-600">
        {zone.areaCount}
      </TableCell>
      <TableCell className="align-top">
        <AdminToggleSwitch
          label={`Enable ${zone.name}`}
          checked={isActive}
          onChange={setIsActive}
          activeClassName="bg-emerald-500"
        />
      </TableCell>
      <TableCell className="align-top text-right">
        <BlueSave
          label={pending ? "Saving…" : "Save"}
          onClick={() => {
            setFormError(null);
            startTransition(async () => {
              const result = await saveShippingZoneAction({
                id: zone.id,
                name,
                isActive,
              });
              if (!result.ok) {
                setFormError(result.formError);
                notifyError(result.formError);
                return;
              }
              notifySuccess("Zone saved");
              router.refresh();
            });
          }}
        />
      </TableCell>
    </TableRow>
  );
}

function AreaRow({ area }: { area: AdminShippingArea }) {
  const router = useRouter();
  const [name, setName] = useState(area.name);
  const [isActive, setIsActive] = useState(area.isActive);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="align-top text-sm text-neutral-600">
        {area.zoneName}
        <span className="mt-0.5 block font-mono text-xs text-neutral-400">
          {area.zoneCode}
        </span>
      </TableCell>
      <TableCell className="align-top">
        <Input
          className={controlClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={`Name for area in ${area.zoneCode}`}
        />
        {formError ? (
          <p className="mt-1 text-xs text-red-600">{formError}</p>
        ) : null}
      </TableCell>
      <TableCell className="align-top">
        <AdminToggleSwitch
          label={`Enable ${area.name}`}
          checked={isActive}
          onChange={setIsActive}
          activeClassName="bg-emerald-500"
        />
      </TableCell>
      <TableCell className="align-top text-right">
        <BlueSave
          label={pending ? "Saving…" : "Save"}
          onClick={() => {
            setFormError(null);
            startTransition(async () => {
              const result = await saveShippingAreaAction({
                id: area.id,
                name,
                isActive,
              });
              if (!result.ok) {
                setFormError(result.formError);
                notifyError(result.formError);
                return;
              }
              notifySuccess("Area saved");
              router.refresh();
            });
          }}
        />
      </TableCell>
    </TableRow>
  );
}

export function AdminShippingZonesPage({
  zones,
}: {
  zones: AdminShippingZone[];
}) {
  return (
    <div className="space-y-6 pb-10">
      <SetupBackLink href="/admin/shipping" label="Back to Shipping methods" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Shipping Zones
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Grouped regions used by cart delivery. Disable a zone to hide it from
          checkout. Countries and cities stay separate.
        </p>
      </div>
      {zones.length === 0 ? (
        <Alert tone="info" title="No zones">
          <p className="text-caption">
            Seed the database to load default zones.
          </p>
        </Alert>
      ) : (
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Areas</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Save</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {zones.map((zone) => (
                <ZoneRow key={zone.id} zone={zone} />
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}

export function AdminShippingAreasPage({
  areas,
}: {
  areas: AdminShippingArea[];
}) {
  return (
    <div className="space-y-6 pb-10">
      <SetupBackLink href="/admin/shipping" label="Back to Shipping methods" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Shipping Areas
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Neighbourhoods within a zone. Disable an area to hide it from
          checkout.
        </p>
      </div>
      {areas.length === 0 ? (
        <Alert tone="info" title="No areas">
          <p className="text-caption">
            Seed the database to load default areas.
          </p>
        </Alert>
      ) : (
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Zone</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Save</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {areas.map((area) => (
                <AreaRow key={area.id} area={area} />
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}

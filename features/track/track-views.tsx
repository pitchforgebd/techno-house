import Link from "next/link";
import {
  CalendarCheck2,
  Check,
  CircleCheck,
  Store,
  Truck,
} from "lucide-react";
import type {
  PublicTrackDetail,
  PublicTrackListItem,
  PublicTrackStepId,
} from "@/lib/orders/public-tracking";
import { cn } from "@/lib/cn";
import { buttonClassName } from "@/components/ui/button";

const STEP_ICONS: Record<
  PublicTrackStepId,
  typeof CalendarCheck2
> = {
  placed: CalendarCheck2,
  confirmed: Store,
  handover: Truck,
  completed: CircleCheck,
};

export function TrackOrderList({
  phone,
  items,
}: {
  phone: string;
  items: PublicTrackListItem[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-5">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">
          Order List for {phone}
        </h1>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-neutral-500 sm:px-5">
          No orders found for this phone number.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-700">
                <th className="px-4 py-3 font-semibold sm:px-5">Order ID</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Order Date</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Order Status</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-neutral-900 sm:px-5">
                    {item.number}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 sm:px-5">
                    {item.placedAtLabel}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 sm:px-5">
                    {item.statusLabel}
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <Link
                      href={`/track/${encodeURIComponent(item.number)}`}
                      className={buttonClassName({
                        size: "sm",
                        // Layout only. The colours come from the button's
                        // own primary variant, so this link follows the theme.
                        className: "rounded-sm px-3",
                      })}
                    >
                      View Tracking Info
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TrackOrderStepper({ detail }: { detail: PublicTrackDetail }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 bg-neutral-100 px-4 py-3 sm:px-5">
        <h1 className="text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
          Tracking Information of Order #{detail.number}
        </h1>
      </div>

      {detail.cancelled ? (
        <p className="px-4 py-6 text-sm text-rose-700 sm:px-5">
          This order was cancelled. Contact support if you need help.
        </p>
      ) : null}

      <div className="px-4 py-10 sm:px-8">
        <ol className="relative mx-auto grid max-w-4xl grid-cols-2 gap-y-10 sm:grid-cols-4 sm:gap-y-0">
          {detail.steps.map((step, index) => {
            const Icon = STEP_ICONS[step.id];
            const active = step.done;
            const isLast = index === detail.steps.length - 1;
            return (
              <li
                key={step.id}
                className="relative flex flex-col items-center text-center"
              >
                {!isLast ? (
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute top-8 hidden h-0.5 sm:block",
                      "left-[calc(50%+2.25rem)] right-[calc(-50%+2.25rem)]",
                      detail.steps[index + 1]?.done
                        ? "bg-emerald-500"
                        : "bg-neutral-200",
                    )}
                  />
                ) : null}
                <div className="relative">
                  <span
                    className={cn(
                      "absolute -left-1 -top-1 inline-flex size-5 items-center justify-center rounded-full border-2 border-white",
                      active ? "bg-emerald-500" : "bg-neutral-300",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </span>
                  <span
                    className={cn(
                      "inline-flex size-16 items-center justify-center rounded-full border-2 bg-white",
                      active
                        ? "border-neutral-800 text-neutral-900"
                        : "border-neutral-200 text-neutral-300",
                    )}
                  >
                    <Icon className="size-7" aria-hidden />
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-3 text-sm font-medium",
                    active ? "text-neutral-900" : "text-neutral-400",
                  )}
                >
                  {step.label}
                </p>
              </li>
            );
          })}
        </ol>

        <dl className="mx-auto mt-10 grid max-w-xl gap-2 border-t border-dashed border-neutral-200 pt-6 text-sm text-neutral-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Status
            </dt>
            <dd className="mt-0.5 font-medium text-neutral-900">
              {detail.statusLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Order date
            </dt>
            <dd className="mt-0.5">{detail.placedAtLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Delivery
            </dt>
            <dd className="mt-0.5">{detail.shippingMethod}</dd>
          </div>
          {detail.trackingCode ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Tracking code
              </dt>
              <dd className="mt-0.5 font-mono">{detail.trackingCode}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

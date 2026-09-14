import Link from "next/link";
import { Package, MapPin, Truck, Wallet } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";

function HubCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: typeof Package;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#3897f0]/10 text-[#3897f0]">
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
          <Link
            href={href}
            className={buttonClassName({ size: "sm", className: "mt-4" })}
          >
            {cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function AdminShippingConfiguration() {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Shipping Configuration
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          At checkout, customers pick their District and Upazila (real
          Bangladesh administrative divisions). Each upazila maps to a
          zone (Inside Dhaka / Outside Dhaka); checkout then charges that
          zone&apos;s weight-based rate for the customer&apos;s selected
          delivery method.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HubCard
          icon={Wallet}
          title="Shipping Rates"
          description="Set the Inside Dhaka / Outside Dhaka rate: a base amount for the first N grams, plus an extra amount per additional kg."
          href="/admin/shipping/rates"
          cta="Manage shipping rates"
        />
        <HubCard
          icon={Truck}
          title="Shipping Methods"
          description="Pathao, Steadfast, manual/flat, and pickup options — which couriers are offered at checkout. Price now comes from Shipping Rates, not the method itself."
          href="/admin/shipping"
          cta="Manage shipping methods"
        />
        <HubCard
          icon={MapPin}
          title="Zones & Areas"
          description="The underlying zone/area rows each district and upazila resolve to. Usually no need to edit directly — manage rates above instead."
          href="/admin/shipping/zones"
          cta="Manage zones & areas"
        />
      </div>

      <p className="text-sm text-neutral-500">
        Country/state/city and a separate carrier list were removed here —
        Bangladesh is single-country and District/Upazila (plus Zones/Areas
        underneath) already cover the geography checkout actually uses, and
        shipping methods already are the carrier list.{" "}
        <Link
          href="/admin/products"
          className="text-[#3897f0] hover:underline"
        >
          Product weight
        </Link>{" "}
        (not price) is what feeds the weight-based rate calculation.
      </p>
    </div>
  );
}

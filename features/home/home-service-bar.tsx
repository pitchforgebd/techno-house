import Link from "next/link";
import { CreditCard, Headphones, Truck, Wallet } from "lucide-react";
import { createLucideIcon } from "@/components/icons/create-lucide-icon";
import { cn } from "@/lib/cn";

const IconEmi = createLucideIcon(Wallet, "size-5");
const IconSupport = createLucideIcon(Headphones, "size-5");
const IconPay = createLucideIcon(CreditCard, "size-5");
const IconCod = createLucideIcon(Truck, "size-5");

/**
 * Each item carries its own accent so the row reads as four distinct
 * promises rather than one repeated tile. All four are existing tokens —
 * `warning` and `danger` are deliberately unused here, since an alarm colour
 * on a reassurance strip says the wrong thing.
 *
 * Solid fills with a white glyph, and no hover treatment at all: this row is
 * a statement of facts, not a menu, so it should look the same whether or
 * not a cursor happens to be over it. White on each fill clears AA —
 * info 5.47:1, primary 5.84:1, success 5.35:1, secondary 13.97:1.
 *
 * Tailwind needs whole class names at build time, so the tones are written
 * out rather than composed from a token name at runtime.
 */
const TONES = {
  info: "bg-info",
  primary: "bg-primary",
  success: "bg-success",
  secondary: "bg-secondary",
} as const;

const ITEMS = [
  {
    id: "emi",
    href: "/checkout",
    title: "EMI on eligible orders",
    text: "Plans shown at checkout.",
    Icon: IconEmi,
    tone: TONES.info,
  },
  {
    id: "support",
    href: "/support",
    title: "Support 9:00–22:00",
    text: "Help pages and product requests.",
    Icon: IconSupport,
    tone: TONES.primary,
  },
  {
    id: "card",
    href: "/checkout",
    title: "SSLCommerz & bKash",
    text: "Online methods at checkout.",
    Icon: IconPay,
    tone: TONES.success,
  },
  {
    id: "cod",
    href: "/shipping",
    title: "Cash on delivery",
    text: "Nationwide where the method is offered.",
    Icon: IconCod,
    tone: TONES.secondary,
  },
] as const;

/**
 * Trust strip under the hero.
 *
 * Was a full-bleed white band on a white page, separated only by hairlines —
 * it read as a table row and disappeared into the background. It now sits in
 * the hero's own `max-w-catalog` rhythm as one raised card, so it reads as a
 * deliberate panel, and it borrows the hover language used by the Guides and
 * "Shopping here" sections (secondary accent wipe, icon tile filling to
 * primary) so the page announces interactivity the same way throughout.
 */
export function HomeServiceBar() {
  return (
    <div className="bg-background pb-4">
      <div className="mx-auto max-w-catalog px-4">
        {/* `gap-px` over a border-coloured surface draws the hairlines
            between cells and keeps working when the grid wraps to 2 up. */}
        <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-[0_16px_40px_-30px_rgb(14_26_36/0.5)] sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <li key={item.id} className="min-w-0 bg-surface">
              <Link
                href={item.href}
                className="flex h-full items-center gap-3.5 px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:px-5 sm:py-5"
              >

                <span
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-white",
                    item.tone,
                  )}
                >
                  <item.Icon />
                </span>

                <span className="min-w-0">
                  <span className="block text-[0.9rem] leading-snug font-bold tracking-tight text-text">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-caption leading-snug text-text-muted">
                    {item.text}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

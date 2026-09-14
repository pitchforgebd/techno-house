import Link from "next/link";
import { ArrowRight, Calculator, ListChecks, ShieldCheck } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { HomeSectionHeader } from "@/features/home/home-section-header";
import { BuilderSlotIcon } from "@/features/pc-builder/builder-slot-icons";
import { BUILDER_SLOTS } from "@/lib/domain/pc-builder/slots";
import { cn } from "@/lib/cn";

const FEATURES = [
  {
    Icon: ListChecks,
    title: "Slot by slot",
    text: "Fill only the slots your build needs — the rest stay optional.",
  },
  {
    Icon: ShieldCheck,
    title: "Compatibility notes",
    text: "Socket, memory type, and power cues appear as you pick parts.",
  },
  {
    Icon: Calculator,
    title: "Running total in ৳",
    text: "The build price updates with every part. Display-only figures.",
  },
] as const;

const REQUIRED_COUNT = BUILDER_SLOTS.filter((slot) => slot.required).length;

/**
 * Homepage promo for PC Builder.
 *
 * The preview panel is drawn from `BUILDER_SLOTS` — the same list the real
 * builder renders — rather than a stock photograph, so the section shows
 * what the tool actually does and cannot drift away from it. No prices or
 * part names are shown: any figure here would be invented, and the running
 * total is the one thing this promo should not fake.
 */
export function HomePcBuilder() {
  return (
    <section aria-labelledby="home-pc-builder" className="scroll-mt-4">
      <HomeSectionHeader
        id="home-pc-builder"
        title="PC Builder"
        lede="Pick parts slot by slot and check the build before you order."
        actionHref="/pc-builder"
        actionLabel="Open builder"
      />

      <div className="mt-6 grid overflow-hidden rounded-sm border border-border bg-surface lg:grid-cols-[1.05fr_1fr]">
        <div className="relative isolate overflow-hidden bg-text px-5 py-7 sm:px-7 sm:py-8">
          {/* Soft corner wash so the flat ink panel has some depth. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-12 -z-10 size-72 rounded-full bg-primary-bright/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 -z-10 size-72 rounded-full bg-primary/40 blur-3xl"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-caption font-semibold tracking-[0.16em] text-surface/60 uppercase">
              Your build
            </p>
            <p className="rounded-full border border-surface/15 bg-surface/10 px-2.5 py-1 text-[0.68rem] font-semibold tabular-nums text-surface/80">
              {REQUIRED_COUNT} required slots
            </p>
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BUILDER_SLOTS.map((slot) => (
              <li
                key={slot.id}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-sm border border-surface/10 bg-surface/[0.06] px-2.5 py-2.5",
                  // 11 slots leave one trailing cell empty at both two and
                  // three columns; the single optional slot takes it so the
                  // grid closes square at every width.
                  !slot.required && "col-span-2",
                )}
              >
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface/10 text-surface/85">
                  <BuilderSlotIcon slotId={slot.id} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[0.78rem] font-semibold text-surface">
                    {slot.label}
                  </span>
                  {!slot.required ? (
                    <span className="block text-[0.65rem] leading-tight text-surface/50">
                      Optional
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-5 flex items-center gap-2 border-t border-surface/10 pt-4 text-caption text-surface/65">
            <ShieldCheck
              aria-hidden
              strokeWidth={1.75}
              className="size-4 shrink-0 text-primary-soft"
            />
            Compatibility is checked as you pick, before anything reaches your
            cart.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-6 px-5 py-7 sm:px-8 sm:py-9">
          <div>
            <p className="text-caption font-semibold tracking-[0.16em] text-secondary uppercase">
              Build your own PC
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-text md:text-[1.7rem]">
              Spec the build before you buy
            </h3>
            <p className="mt-2.5 max-w-prose text-body leading-relaxed text-text-muted">
              Choose each part in order, read the compatibility notes as you go,
              and move the finished build straight into your cart.
            </p>
          </div>

          <ul className="grid gap-3.5">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-soft text-primary">
                  <Icon aria-hidden strokeWidth={1.75} className="size-4.5" />
                </span>
                <span>
                  <span className="block text-label font-semibold text-text">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-caption leading-relaxed text-text-muted">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p>
            <Link
              href="/pc-builder"
              className={buttonClassName({
                className: "group min-w-48 gap-2",
              })}
            >
              Open PC Builder
              <ArrowRight
                aria-hidden
                strokeWidth={2}
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

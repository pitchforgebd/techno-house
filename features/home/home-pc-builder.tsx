import Image from "next/image";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

const HIGHLIGHTS = [
  {
    title: "Slot by slot",
    text: "CPU, board, memory, GPU, storage, and more — fill what you need.",
  },
  {
    title: "Compatibility notes",
    text: "Socket, RAM type, and power cues show before you add to cart.",
  },
  {
    title: "Running total in ৳",
    text: "See the build price update as you pick parts. Display-only.",
  },
] as const;

const IMAGE =
  "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&h=900&q=80";

export function HomePcBuilder() {
  return (
    <section aria-labelledby="home-pc-builder" className="scroll-mt-4">
      <div className="flex items-stretch">
        <h2
          id="home-pc-builder"
          className="flex shrink-0 items-center bg-text px-4 py-2 pr-7 text-label font-semibold tracking-tight text-primary-foreground [clip-path:polygon(0_0,calc(100%-0.85rem)_0,100%_100%,0_100%)]"
        >
          PC Builder
        </h2>
        <div className="flex min-w-0 flex-1 items-end justify-end border-b-2 border-text pb-1.5">
          <Link
            href="/pc-builder"
            className="text-caption font-medium text-primary underline-offset-2 hover:underline"
          >
            Open builder
          </Link>
        </div>
      </div>

      <div className="mt-8 grid overflow-hidden border border-border bg-surface lg:grid-cols-2">
        <div className="relative min-h-56 bg-text sm:min-h-72 lg:min-h-full">
          <Image
            src={IMAGE}
            alt="Open PC case with installed components"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-text/50 to-transparent lg:bg-gradient-to-t lg:from-text/40 lg:via-transparent"
          />
        </div>

        <div className="flex flex-col justify-center gap-6 px-5 py-7 sm:px-8 sm:py-10">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-text">
              Spec the build before you buy
            </p>
            <p className="mt-2 max-w-prose text-body text-text-muted">
              Choose parts slot by slot, watch the running total, and read
              compatibility notes — then move the whole build into the cart.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="border-t border-border pt-3">
                <p className="text-label font-semibold text-text">{item.title}</p>
                <p className="mt-1 text-caption leading-relaxed text-text-muted">
                  {item.text}
                </p>
              </li>
            ))}
          </ul>

          <p>
            <Link
              href="/pc-builder"
              className={buttonClassName({
                className: "min-w-44",
              })}
            >
              Open PC Builder
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

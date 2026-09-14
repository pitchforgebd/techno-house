import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck, Timer } from "lucide-react";
import { getAuthPageTheme } from "@/lib/design/theme-settings";
import type { ReactNode } from "react";

/**
 * Shared frame for the four public auth routes (customer sign in / register,
 * wholesale sign in / register).
 *
 * Every claim in the assurance panel is checked against the code, not
 * decoration: Argon2id with OWASP parameters is `lib/auth/password.ts`,
 * the throttle is `limitCustomerLogin` in `lib/auth/customer-auth.ts`, and
 * the httpOnly flag is `lib/auth/session-cookie.ts`. Do not add a point
 * here that the implementation does not actually do — a security promise a
 * sign-in page cannot keep is worse than no promise at all.
 */
const ASSURANCES = [
  {
    Icon: KeyRound,
    title: "Passwords are hashed with Argon2id",
    text: "Stored with OWASP-recommended parameters — never in readable form.",
  },
  {
    Icon: Timer,
    title: "Sign-in attempts are rate limited",
    text: "Repeated failures are throttled per account and per network.",
  },
  {
    Icon: ShieldCheck,
    title: "Sessions use httpOnly cookies",
    text: "The session token cannot be read by scripts running on the page.",
  },
] as const;

export async function AccountAuthShell({
  title,
  description,
  eyebrow,
  note,
  children,
}: {
  title: string;
  description: string;
  /** Small label above the heading — e.g. "Wholesale". */
  eyebrow?: string;
  /** Route-specific callout at the top of the assurance panel. */
  note?: string;
  children: ReactNode;
}) {
  const theme = await getAuthPageTheme();

  return (
    <div
      className="px-4 py-10 sm:py-14"
      style={theme.bgColor ? { backgroundColor: theme.bgColor } : undefined}
    >
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft aria-hidden strokeWidth={2} className="size-3.5" />
          Back to store
        </Link>

        <div className="mt-5 grid overflow-hidden rounded-lg border border-border bg-surface shadow-[0_24px_60px_-40px_rgb(14_26_36/0.45)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          {/* Form first in the DOM: it is the reason the page exists, so it
              leads for keyboard and screen-reader users and stacks on top. */}
          <div
            className="order-1 px-5 py-8 sm:px-9 sm:py-10"
            style={
              theme.panelColor
                ? { backgroundColor: theme.panelColor }
                : undefined
            }
          >
            <header className="max-w-prose">
              {eyebrow ? (
                <p className="text-caption font-semibold tracking-[0.16em] text-secondary uppercase">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-label leading-relaxed text-text-muted">
                {description}
              </p>
            </header>

            <div className="mt-7">{children}</div>
          </div>

          <aside className="relative isolate order-2 overflow-hidden bg-text px-5 py-8 sm:px-8 sm:py-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-12 -z-10 size-64 rounded-full bg-primary/40 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-16 -z-10 size-64 rounded-full bg-primary-bright/25 blur-3xl"
            />

            <p className="text-caption font-semibold tracking-[0.16em] text-surface/55 uppercase">
              Techno House
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-surface">
              Your account, handled carefully
            </p>

            {note ? (
              <p className="mt-5 rounded-sm border border-primary-bright/45 bg-primary-bright/15 px-3.5 py-3 text-caption leading-relaxed text-surface/85">
                {note}
              </p>
            ) : null}

            <ul className="mt-6 grid gap-5">
              {ASSURANCES.map(({ Icon, title: heading, text }) => (
                <li key={heading} className="flex gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary/30 text-primary-soft ring-1 ring-surface/10">
                    <Icon aria-hidden strokeWidth={1.75} className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-label font-semibold text-surface">
                      {heading}
                    </span>
                    <span className="mt-0.5 block text-caption leading-relaxed text-surface/60">
                      {text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {theme.illustrationSrc ? (
              <div className="relative mt-7 hidden aspect-[4/3] w-full overflow-hidden rounded-sm ring-1 ring-surface/10 lg:block">
                <Image
                  src={theme.illustrationSrc}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}

            <p className="mt-7 border-t border-surface/10 pt-5 text-caption leading-relaxed text-surface/55">
              Staff sign-in lives on a separate route and is not available
              here.{" "}
              <Link
                href="/support"
                className="font-semibold text-primary-soft underline-offset-2 hover:underline"
              >
                Need help?
              </Link>
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

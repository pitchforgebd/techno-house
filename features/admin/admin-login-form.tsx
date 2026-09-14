"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  useTransition,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginStaffAction } from "@/features/admin/auth-actions";
import { useStaffSession } from "@/features/admin/staff-session-provider";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_PASSWORD_MAX,
} from "@/lib/account/validation";
import { safeAdminReturnPath } from "@/lib/auth/return-path";
import { cn } from "@/lib/cn";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.1 12S6.4 5.5 12 5.5 20.9 12 20.9 12 17.6 18.5 12 18.5 3.1 12 3.1 12Z"
        />
        <circle cx="12" cy="12" r="2.75" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.1 12S6.4 5.5 12 5.5 20.9 12 20.9 12 17.6 18.5 12 18.5 3.1 12 3.1 12Z"
      />
      <path strokeLinecap="round" d="M4 4l16 16" />
    </svg>
  );
}

function LockMark() {
  return (
    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path
          strokeLinecap="round"
          d="M8 11V8a4 4 0 0 1 8 0v3"
        />
      </svg>
    </span>
  );
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useStaffSession();
  const nextPath = safeAdminReturnPath(searchParams.get("next"));
  const formId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (session) {
    return (
      <div
        className={cn(
          "mx-auto w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-white/95 p-7 text-center shadow-xl shadow-black/20 backdrop-blur transition duration-500",
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <LockMark />
        <div>
          <p className="text-label font-semibold text-text">
            Signed in as {session.fullName}
          </p>
          <p className="mt-1 font-mono text-caption text-text-muted">
            {session.email}
          </p>
          <p className="mt-1 text-caption text-text-muted">{session.roleName}</p>
        </div>
        <Link
          href={nextPath}
          className={buttonClassName({ className: "w-full" })}
        >
          Continue to admin
        </Link>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await loginStaffAction({ email, password });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? null);
        return;
      }
      setPassword("");
      setErrors({});
      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_24px_80px_-24px_rgba(8,24,32,0.55)] transition duration-700 lg:grid-cols-[1.05fr_0.95fr]",
        mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <aside className="relative hidden overflow-hidden bg-[#0a1c24] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 20%, rgba(18,94,106,0.55), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(184,97,44,0.28), transparent 50%), linear-gradient(160deg, #07151c 0%, #0e2a33 48%, #123840 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative">
          <p className="font-mono text-[0.7rem] tracking-[0.22em] text-teal-200/80 uppercase">
            Techno House
          </p>
          <h1 className="mt-4 max-w-sm text-3xl font-semibold tracking-tight text-white">
            Operations console
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
            Staff-only access for catalogue, orders, and store settings. Separate
            from customer accounts.
          </p>
        </div>
        <ul className="relative space-y-3 text-sm text-slate-300">
          <li className="flex gap-3">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-teal-300" />
            Session cookies are httpOnly and validated on every request.
          </li>
          <li className="flex gap-3">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-teal-300" />
            Sign-in attempts are rate-limited per IP and email.
          </li>
          <li className="flex gap-3">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-teal-300" />
            This gate URL is not linked from the public storefront.
          </li>
        </ul>
      </aside>

      <div className="relative bg-gradient-to-b from-slate-50 to-white px-6 py-8 sm:px-10 sm:py-12">
        <div className="mb-8 lg:hidden">
          <p className="font-mono text-[0.65rem] tracking-[0.2em] text-primary uppercase">
            Techno House · Staff
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">
            Operations console
          </h1>
        </div>

        <div className="mb-6 flex items-start gap-3">
          <LockMark />
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text">
              Sign in
            </h2>
            <p className="mt-1 text-caption text-text-muted">
              Use your staff work email and password.
            </p>
          </div>
        </div>

        {formError ? (
          <div className="mb-5">
            <Alert tone="danger" title="Could not sign in">
              <p className="text-caption">{formError}</p>
            </Alert>
          </div>
        ) : null}

        <form
          id={formId}
          className="space-y-4"
          onSubmit={handleSubmit}
          noValidate
          autoComplete="on"
        >
          <Field label="Work email" htmlFor="admin-email" error={errors.email}>
            <Input
              id="admin-email"
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              spellCheck={false}
              value={email}
              maxLength={ACCOUNT_EMAIL_MAX}
              placeholder="you@company.com"
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
              className="h-11 font-mono text-[0.9375rem]"
            />
          </Field>

          <Field
            label="Password"
            htmlFor="admin-password"
            error={errors.password}
            hint={capsOn ? "Caps Lock is on" : undefined}
          >
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                maxLength={ACCOUNT_PASSWORD_MAX}
                onChange={(event) => setPassword(event.target.value)}
                onKeyUp={(event) =>
                  setCapsOn(event.getModifierState("CapsLock"))
                }
                onKeyDown={(event) =>
                  setCapsOn(event.getModifierState("CapsLock"))
                }
                disabled={pending}
                className="h-11 pr-11"
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-muted hover:text-text"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={pending}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </Field>

          <Button
            type="submit"
            className="mt-2 h-11 w-full gap-2"
            disabled={pending}
          >
            {pending ? (
              <>
                <span
                  className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                  aria-hidden
                />
                Verifying…
              </>
            ) : (
              "Sign in securely"
            )}
          </Button>
        </form>

        <p className="mt-8 border-t border-border pt-5 text-center text-caption text-text-muted">
          Looking for the storefront?{" "}
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Return to Techno House
          </Link>
        </p>
      </div>
    </div>
  );
}

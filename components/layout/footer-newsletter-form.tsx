"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletterAction } from "@/features/newsletter/newsletter-actions";

export function FooterNewsletterForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await subscribeNewsletterAction({ email });
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      setMessage("You are subscribed.");
      setEmail("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-xs">
      <p className="text-[0.72rem] font-bold tracking-[0.16em] text-primary-foreground uppercase">
        Newsletter
      </p>
      <p className="mt-2 text-caption leading-relaxed text-primary-foreground/60">
        Guides and catalogue notes. No campaign send in this build.
      </p>
      {/* Dark footer: the teal `primary` is unreadable here, so the accent is
          a solid button plus the light `primary-soft` tint. */}
      <div className="mt-3 flex overflow-hidden rounded-md border border-primary-foreground/15 bg-primary-foreground/5 transition-colors focus-within:border-primary-soft/50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-soft/60">
        <label htmlFor="footer-newsletter" className="sr-only">
          Email
        </label>
        <input
          id="footer-newsletter"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-label text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 bg-primary px-4 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Join"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-caption text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-caption text-primary-soft" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}

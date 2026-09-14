"use client";

export type UsableOAuthProviders = { GOOGLE: boolean; FACEBOOK: boolean };

/**
 * "Continue with Google/Facebook" buttons, linking to the real
 * `/api/auth/social/<provider>` route handler (Phase 9).
 *
 * A provider is only usable when it is enabled, has a client id, and the
 * matching secret env var is set. Unusable providers are now omitted rather
 * than rendered as disabled buttons: on the redesigned auth pages two dead
 * grey controls sat above the form and were the first thing a shopper saw,
 * advertising an integration the store has not configured. Nothing false is
 * shown either way — this just stops the page leading with a dead end.
 * (If you want the old behaviour back, render the unusable ones disabled
 * here; the honesty argument for that was about never linking to a route
 * nothing backs, which omitting them also satisfies.)
 *
 * The divider belongs to this component so that when no provider is usable
 * the whole block — buttons and "or sign in with email" rule — disappears
 * together, instead of leaving an orphaned divider above the email field.
 */
export function SocialLoginButtons({
  usableProviders,
  returnTo,
  dividerLabel,
}: {
  usableProviders?: UsableOAuthProviders;
  returnTo: string;
  dividerLabel: string;
}) {
  const next = encodeURIComponent(returnTo);
  const providers = (
    [
      { id: "google", label: "Continue with Google", usable: usableProviders?.GOOGLE ?? false },
      { id: "facebook", label: "Continue with Facebook", usable: usableProviders?.FACEBOOK ?? false },
    ] as const
  ).filter((provider) => provider.usable);

  if (providers.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-2.5">
        {providers.map((provider) => (
          <a
            key={provider.id}
            href={`/api/auth/social/${provider.id}?next=${next}`}
            className="flex w-full items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 text-body font-semibold text-text transition-colors hover:border-primary/40 hover:bg-primary-soft/60"
          >
            {provider.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-3 text-caption text-text-muted">
        <span className="h-px flex-1 bg-border" aria-hidden />
        {dividerLabel}
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
    </>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background font-sans text-text antialiased">
        <main className="mx-auto max-w-content px-4 py-8">
          <ErrorState
            title="The site could not load"
            action={
              <Button type="button" onClick={reset}>
                Try again
              </Button>
            }
          />
        </main>
      </body>
    </html>
  );
}

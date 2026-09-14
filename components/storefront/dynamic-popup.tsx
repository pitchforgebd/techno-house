"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StorefrontPopup } from "@/lib/marketing/popups";

const SEEN_KEY_PREFIX = "th-popup-seen-";

/**
 * The modal marketing popup (Admin -> Marketing -> Dynamic Popups).
 *
 * Built on the native `<dialog>` element rather than a hand-rolled overlay:
 * `showModal()` gives the focus trap, the Escape key, the inert background and
 * the top-layer stacking for free, and all four are easy to get subtly wrong by
 * hand. What is left here is the entrance/exit choreography, the body scroll
 * lock (which `<dialog>` does not cover) and the seen-tracking.
 */
export function DynamicPopup({ popup }: { popup: StorefrontPopup | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!popup) {
      return;
    }
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SEEN_KEY_PREFIX + popup.id) === "1";
    } catch {
      // Private browsing / storage blocked — treat as not seen.
    }
    if (alreadySeen) {
      return;
    }
    const timer = setTimeout(
      () => setOpen(true),
      Math.max(0, popup.delaySeconds) * 1000,
    );
    return () => clearTimeout(timer);
  }, [popup]);

  // The dialog has to be in the DOM before `showModal()` can put it in the top
  // layer, so opening is an effect rather than something done inline.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node || !open || node.open) {
      return;
    }
    node.showModal();
    // `showModal()` focuses the first focusable child, which here is the close
    // button — opening the popup with a focus ring already sitting on the X.
    // Move focus to the card instead: still inside the dialog, so the trap and
    // the screen-reader announcement hold, but nothing looks pre-selected.
    cardRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const markSeen = useCallback(() => {
    if (!popup) {
      return;
    }
    try {
      sessionStorage.setItem(SEEN_KEY_PREFIX + popup.id, "1");
    } catch {
      // Ignore — worst case the popup can reappear this session.
    }
  }, [popup]);

  /**
   * Starts the exit animation. The unmount happens in `finish` once the
   * animation ends, but the popup is marked seen here: a click on the CTA
   * navigates away, and that can easily beat the animation to the finish.
   */
  const requestClose = useCallback(() => {
    markSeen();
    setExiting(true);
  }, [markSeen]);

  /**
   * Tears the popup down. Safe to call twice — the native `close` event fires
   * it a second time after `close()` below, and both paths want the same end
   * state.
   */
  const finish = useCallback(() => {
    markSeen();
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
    setExiting(false);
    setOpen(false);
  }, [markSeen]);

  if (!popup || !open) {
    return null;
  }

  const onImage = Boolean(popup.imagePath);
  const buttonStyle = {
    backgroundColor: popup.buttonColor,
    color: popup.buttonTextTone === "light" ? "#ffffff" : "var(--color-text)",
  };

  return (
    <dialog
      ref={dialogRef}
      className="th-popup"
      data-exiting={exiting ? "true" : undefined}
      aria-labelledby="th-popup-title"
      aria-describedby={popup.summary ? "th-popup-summary" : undefined}
      // Escape is intercepted at keydown, not at the dialog's own `cancel`
      // event. Chrome routes Escape through a CloseWatcher, and cancelling
      // *that* silently requires sticky user activation — so a visitor who
      // presses Escape without having clicked anything first closes the dialog
      // outright, `display: none` lands before the exit animation can run, and
      // the scroll lock never gets released. Cancelling the keydown stops the
      // close request from being fired at all, which has no such condition.
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          requestClose();
        }
      }}
      // Belt and braces for any UA that closes without a cancellable keydown.
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // If the dialog closes anyway, land on the same end state rather than
      // leaving a hidden dialog and a locked page body behind.
      onClose={finish}
      // The dialog box spans the viewport and is transparent, so a click that
      // lands on the element itself rather than on the card is a backdrop click.
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          requestClose();
        }
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="th-popup-card relative max-h-full w-full max-w-md overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-surface text-left shadow-2xl outline-none"
        // The card's exit animation is the last thing to finish, so it owns the
        // unmount. Children bubble their animations through here too.
        onAnimationEnd={(event) => {
          if (exiting && event.target === event.currentTarget) {
            finish();
          }
        }}
      >
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close"
          className={
            onImage
              ? "absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-text/60 text-white backdrop-blur-sm transition hover:bg-text/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              : "absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-surface-muted text-text-muted transition hover:bg-border hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          }
        >
          <X className="size-4" aria-hidden />
        </button>
        {popup.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={popup.imagePath}
            alt=""
            className="aspect-[512/280] w-full object-cover"
          />
        ) : null}
        <div className="space-y-2.5 p-6">
          <h2
            id="th-popup-title"
            className="text-xl font-bold tracking-tight text-balance text-text"
          >
            {popup.title}
          </h2>
          {popup.summary ? (
            <p
              id="th-popup-summary"
              className="text-sm leading-relaxed text-text-muted"
            >
              {popup.summary}
            </p>
          ) : null}
          {popup.buttonText ? (
            <div className="pt-1.5">
              {popup.link ? (
                <a
                  href={popup.link}
                  onClick={requestClose}
                  className="block w-full rounded-lg py-3 text-center text-sm font-semibold shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:brightness-95"
                  style={buttonStyle}
                >
                  {popup.buttonText}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={requestClose}
                  className="block w-full rounded-lg py-3 text-center text-sm font-semibold shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:brightness-95"
                  style={buttonStyle}
                >
                  {popup.buttonText}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

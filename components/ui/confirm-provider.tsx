"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending(options);
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  const close = useCallback((result: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setPending(null);
    resolve?.(result);
  }, []);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) {
      return;
    }
    if (pending && !node.open) {
      node.showModal();
    }
    if (!pending && node.open) {
      node.close();
    }
  }, [pending]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        className={cn(
          "th-dialog w-[min(100%,24rem)] rounded-lg border border-border bg-surface p-0 text-text shadow-md",
        )}
        onClose={() => close(false)}
        aria-labelledby={pending ? "th-confirm-title" : undefined}
      >
        {pending ? (
          <>
            <div className="border-b border-border px-5 py-4">
              <p
                id="th-confirm-title"
                className="text-lg font-semibold tracking-tight text-text"
              >
                {pending.title}
              </p>
              {pending.description ? (
                <p className="mt-2 text-body text-text-muted">
                  {pending.description}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => close(false)}
              >
                {pending.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant={pending.tone === "danger" ? "danger" : "primary"}
                size="sm"
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}

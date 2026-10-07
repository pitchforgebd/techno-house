"use client";

import { usePathname } from "next/navigation";
import {
  Bounce,
  ToastContainer,
  cssTransition,
  toast,
  type ToastOptions,
} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import type { ReactNode } from "react";

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 3200,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: false,
  theme: "light",
};

/**
 * The customer storefront's alert entrance: pops up into place with a small
 * overshoot and lifts away on exit (`th-toast-jump-in` / `th-toast-jump-out` in
 * globals.css). Staff screens keep the library's default transition (AD-364).
 */
const JumpUp = cssTransition({
  enter: "th-toast-jump-in",
  exit: "th-toast-jump-out",
});

export function FeedbackProvider({ children }: { children: ReactNode }) {
  // The container sits in the root layout, above both the storefront and the
  // admin panel, so the route decides which transition the alerts get.
  const pathname = usePathname();
  const inAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");
  // Staff screens get the library's default, `Bounce`, named explicitly. Never
  // pass `transition={undefined}` to mean "the default": the container merges
  // its props over its defaults, so an explicit undefined REPLACES Bounce, the
  // next toast fails to render ("Element type is invalid ... got: undefined")
  // and the app drops into the global error page — which is what every admin
  // save did after AD-364 until this was fixed (AD-367).

  return (
    <ConfirmProvider>
      {children}
      <ToastContainer
        {...defaultOptions}
        newestOnTop
        limit={4}
        toastClassName="th-toast"
        progressClassName="th-toast-progress"
        transition={inAdmin ? Bounce : JumpUp}
      />
    </ConfirmProvider>
  );
}

export type NotifyPayload = {
  title: string;
  description?: string;
};

function ToastMessage({ title, description }: NotifyPayload) {
  return (
    <div className="th-toast-content">
      <p className="th-toast-title">{title}</p>
      {description ? (
        <p className="th-toast-desc">{description}</p>
      ) : null}
    </div>
  );
}

export function notifySuccess(payload: NotifyPayload | string) {
  const data =
    typeof payload === "string" ? { title: payload } : payload;
  toast.success(<ToastMessage {...data} />, { ...defaultOptions });
}

export function notifyInfo(payload: NotifyPayload | string) {
  const data =
    typeof payload === "string" ? { title: payload } : payload;
  toast.info(<ToastMessage {...data} />, { ...defaultOptions });
}

export function notifyError(payload: NotifyPayload | string) {
  const data =
    typeof payload === "string" ? { title: payload } : payload;
  toast.error(<ToastMessage {...data} />, {
    ...defaultOptions,
    autoClose: 4500,
  });
}

export function notifyToast(title: string) {
  toast.success(<ToastMessage title={title} />, {
    ...defaultOptions,
    autoClose: 2200,
  });
}

export function notifyAddedToCart(onViewCart: () => void) {
  toast.success(
    ({ closeToast }) => (
      <div className="th-toast-content">
        <p className="th-toast-title">Added to cart</p>
        <p className="th-toast-desc">
          Saved on this device. Totals are display-only — nothing is charged.
        </p>
        <div className="th-toast-actions">
          <button
            type="button"
            className="th-toast-btn th-toast-btn-primary"
            onClick={() => {
              closeToast?.();
              onViewCart();
            }}
          >
            View cart
          </button>
          <button
            type="button"
            className="th-toast-btn"
            onClick={() => closeToast?.()}
          >
            Continue
          </button>
        </div>
      </div>
    ),
    { ...defaultOptions, autoClose: 5000 },
  );
}

export function notifyBuildAddedToCart(
  text: string,
  onViewCart: () => void,
) {
  toast.success(
    ({ closeToast }) => (
      <div className="th-toast-content">
        <p className="th-toast-title">Build added to cart</p>
        <p className="th-toast-desc">{text}</p>
        <div className="th-toast-actions">
          <button
            type="button"
            className="th-toast-btn th-toast-btn-primary"
            onClick={() => {
              closeToast?.();
              onViewCart();
            }}
          >
            View cart
          </button>
          <button
            type="button"
            className="th-toast-btn"
            onClick={() => closeToast?.()}
          >
            Continue
          </button>
        </div>
      </div>
    ),
    { ...defaultOptions, autoClose: 5500 },
  );
}

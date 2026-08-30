"use client";

import { ToastContainer, toast, type ToastOptions } from "react-toastify";
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

export function FeedbackProvider({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
      <ToastContainer
        {...defaultOptions}
        newestOnTop
        limit={4}
        toastClassName="th-toast"
        progressClassName="th-toast-progress"
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

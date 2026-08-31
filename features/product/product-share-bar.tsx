"use client";

import {
  Link2,
  Mail,
  MessageCircle,
  MessagesSquare,
  Printer,
  Share2,
  X,
  type LucideIcon,
} from "lucide-react";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { cn } from "@/lib/cn";

type ProductShareBarProps = {
  productName: string;
  className?: string;
};

function shareUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.href;
}

function openShare(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

type ShareItem = {
  label: string;
  className: string;
  iconClassName?: string;
  onClick: () => void;
  Icon: LucideIcon;
};

export function ProductShareBar({ productName, className }: ProductShareBarProps) {
  const url = shareUrl();
  const text = encodeURIComponent(`Check out ${productName} on Techno House`);

  function copyLink() {
    if (!url) {
      return;
    }
    void navigator.clipboard.writeText(url).then(() => {
      notifySuccess({
        title: "Link copied",
        description: "Product link copied to your clipboard.",
      });
    });
  }

  function printPage() {
    window.print();
  }

  const items: ShareItem[] = [
    {
      label: "Share on WhatsApp",
      className: "bg-[#25D366] text-white hover:opacity-90",
      onClick: () =>
        openShare(`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`),
      Icon: MessageCircle,
    },
    {
      label: "Share by email",
      className: "bg-danger text-white hover:opacity-90",
      onClick: () =>
        openShare(
          `mailto:?subject=${encodeURIComponent(productName)}&body=${text}%20${encodeURIComponent(url)}`,
        ),
      Icon: Mail,
    },
    {
      label: "Share on Facebook",
      className: "bg-[#1877F2] text-white hover:opacity-90",
      onClick: () =>
        openShare(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        ),
      Icon: Share2,
    },
    {
      label: "Share on Messenger",
      className: "bg-[#0084FF] text-white hover:opacity-90",
      onClick: () =>
        openShare(
          `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=0&redirect_uri=${encodeURIComponent(url)}`,
        ),
      Icon: MessagesSquare,
    },
    {
      label: "Share on X",
      className: "bg-text text-white hover:opacity-90",
      onClick: () =>
        openShare(
          `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
        ),
      Icon: X,
    },
    {
      label: "Print page",
      className: "border border-border bg-surface text-text hover:bg-surface-muted",
      onClick: printPage,
      Icon: Printer,
    },
    {
      label: "Copy link",
      className: "border border-border bg-surface-muted text-text hover:bg-surface",
      onClick: copyLink,
      Icon: Link2,
    },
  ];

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-caption font-medium text-text-muted">Share this product</p>
      <ul className="flex flex-wrap gap-2" role="list">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              aria-label={item.label}
              title={item.label}
              onClick={item.onClick}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-lg shadow-sm transition-colors",
                item.className,
              )}
            >
              <item.Icon
                aria-hidden
                className={cn("size-[1.125rem]", item.iconClassName)}
                strokeWidth={2}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

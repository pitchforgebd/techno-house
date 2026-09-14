"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { notifyError } from "@/components/ui/feedback-provider";
import { AccountShell } from "@/features/account/account-shell";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/account/notification-actions";
import type { InboxNotification } from "@/lib/notifications/types";

function kindLabel(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function AccountNotificationsView({
  items: persisted,
}: {
  items: InboxNotification[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const items = persisted.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    body: item.body,
    href: item.href,
    createdAt: item.createdAt,
    unread: !item.readAt,
  }));

  const unreadIds = items.filter((item) => item.unread).map((item) => item.id);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      router.refresh();
    });
  }

  return (
    <AccountShell title="Notifications">
      <div className="space-y-6">
        <p className="text-caption text-text-muted">
          In-app alerts for this account.
        </p>

        <section aria-labelledby="notification-inbox-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2
              id="notification-inbox-heading"
              className="text-label font-semibold text-text"
            >
              Inbox
            </h2>
            {unreadIds.length > 0 ? (
              <button
                type="button"
                className={buttonClassName({ size: "sm", variant: "ghost" })}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No notifications yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-surface">
              {items.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-text">
                          {item.title}
                        </p>
                        {item.unread ? <Badge tone="new">New</Badge> : null}
                      </div>
                      {item.body ? (
                        <p className="mt-1 text-caption text-text-muted">
                          {item.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-caption text-text-muted">
                        {kindLabel(item.kind)} ·{" "}
                        {new Date(item.createdAt).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className={buttonClassName({
                            size: "sm",
                            variant: "secondary",
                          })}
                        >
                          Open
                        </Link>
                      ) : null}
                      {item.unread ? (
                        <button
                          type="button"
                          className={buttonClassName({
                            size: "sm",
                            variant: "ghost",
                          })}
                          onClick={() => handleMarkRead(item.id)}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AccountShell>
  );
}

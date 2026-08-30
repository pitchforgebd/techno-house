"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountShell } from "@/features/account/account-shell";
import { useMockNotifications } from "@/features/account/use-mock-notifications";
import { useMockOrders } from "@/features/account/use-mock-orders";
import { useMockTickets } from "@/features/account/use-mock-tickets";
import {
  MOCK_NOTIFICATION_KIND_LABEL,
  deriveMockNotifications,
} from "@/lib/account/mock-notifications";

export function AccountNotificationsView() {
  const { orders } = useMockOrders();
  const { tickets } = useMockTickets();
  const { prefs, readIds, setPref, markRead, markAllRead } =
    useMockNotifications();

  const items = useMemo(
    () =>
      deriveMockNotifications({
        orders,
        tickets,
      }),
    [orders, tickets],
  );

  const unreadIds = items
    .filter((item) => !readIds.includes(item.id))
    .map((item) => item.id);

  return (
    <AccountShell title="Notifications">
      <div className="space-y-8">
        <p className="text-caption text-text-muted">
          Preview inbox from this device only. Nothing is emailed, texted, or
          pushed.
        </p>

        <section aria-labelledby="notification-prefs-heading">
          <h2
            id="notification-prefs-heading"
            className="text-label font-semibold text-text"
          >
            Preferences
          </h2>
          <p className="mt-1 text-caption text-text-muted">
            Toggles are stored locally. They do not send messages.
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <Checkbox
                id="pref-email-orders"
                label="Email order updates (preview)"
                checked={prefs.emailOrders}
                onChange={(event) =>
                  setPref("emailOrders", event.target.checked)
                }
              />
            </li>
            <li>
              <Checkbox
                id="pref-email-support"
                label="Email ticket updates (preview)"
                checked={prefs.emailSupport}
                onChange={(event) =>
                  setPref("emailSupport", event.target.checked)
                }
              />
            </li>
            <li>
              <Checkbox
                id="pref-sms-orders"
                label="SMS order updates (preview)"
                checked={prefs.smsOrders}
                onChange={(event) => setPref("smsOrders", event.target.checked)}
              />
            </li>
          </ul>
        </section>

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
                className={buttonClassName({ variant: "ghost", size: "sm" })}
                onClick={() => markAllRead(unreadIds)}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-surface">
            {items.map((item) => {
              const unread = !readIds.includes(item.id);
              const when = new Date(item.createdAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              });
              const showWhen = item.id !== "account-welcome";
              return (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">
                      {MOCK_NOTIFICATION_KIND_LABEL[item.kind]}
                    </Badge>
                    {unread ? <Badge tone="new">Unread</Badge> : null}
                  </div>
                  <p className="mt-2 text-label font-medium text-text">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-caption text-text-muted">
                    {item.body}
                    {showWhen ? ` · ${when}` : null}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-3">
                    <Link
                      href={item.href}
                      className="text-caption font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Open
                    </Link>
                    {unread ? (
                      <button
                        type="button"
                        className="text-caption font-medium text-text-muted underline-offset-2 hover:underline"
                        onClick={() => markRead(item.id)}
                      >
                        Mark read
                      </button>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AccountShell>
  );
}

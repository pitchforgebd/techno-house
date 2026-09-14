export type InboxNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

export const CUSTOM_NOTIFICATION_TYPES = ["promo", "info", "alert"] as const;

export type CustomNotificationType = (typeof CUSTOM_NOTIFICATION_TYPES)[number];

export const CUSTOM_NOTIFICATION_AUDIENCES = [
  "all",
  "verified",
  "recent",
] as const;

export type CustomNotificationAudience =
  (typeof CUSTOM_NOTIFICATION_AUDIENCES)[number];

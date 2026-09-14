export type NewsletterSubscriberRow = {
  id: string;
  email: string;
  name: string;
  status: "subscribed" | "unsubscribed" | "bounced";
  source: string;
  subscribedAt: string;
};

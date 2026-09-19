/**
 * The public, no-login order tracking page (`/track/[orderNumber]`) — asks
 * for the last few digits of the order's phone number before showing
 * anything (DSA-05), so it's safe to link from an email or SMS a guest
 * checkout customer receives without ever creating an account.
 */
export function orderTrackingPath(orderNumber: string): string {
  return `/track/${encodeURIComponent(orderNumber)}`;
}

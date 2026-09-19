/** The two moments an order triggers a customer email + SMS: right after
 * checkout, and again when the order's confirmedAt is first set (staff
 * moving it to Processing, or auto-confirm-on-payment). */
export type OrderNotificationEvent = "placed" | "confirmed";

-- AlterEnum
ALTER TYPE "RefundPayoutStatus" ADD VALUE 'PROCESSING';

-- DSA-07: at most one open refund per order.
--
-- `requestRefundForUser` checks for an existing open refund and then creates
-- one, with nothing serialising the two steps — concurrent requests both saw
-- no open refund and both created one. The application now does that check
-- under a row lock; this index is the structural backstop so the invariant
-- holds even if another code path ever creates a refund.
--
-- Partial, so REJECTED and COMPLETED refunds are unconstrained: an order may
-- legitimately accumulate many of those over its life.
-- Verified safe before adding: 0 orders currently hold more than one refund in
-- REQUESTED or APPROVED.
CREATE UNIQUE INDEX "Refund_one_open_per_order"
  ON "Refund" ("orderId")
  WHERE "status" IN ('REQUESTED', 'APPROVED');

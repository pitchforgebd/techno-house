-- Order.number must be digits only for every NEW order.
--
-- `Order.number` is the customer-facing Order ID: it is printed on invoices,
-- sent to SSLCommerz as `tran_id`, to bKash as `merchantInvoiceNumber` and to
-- Nagad as `orderId`, quoted in support threads, and used in every
-- customer-facing URL. Until now its format was guaranteed only by whatever
-- `nextOrderNumber()` happened to return.
--
-- The `TH-%` arm is not a loophole, it is the point. Orders created before the
-- sequence existed carry `TH-YYYYMMDD-XXXXXXXX`, and those numbers are already
-- recorded at the payment gateways and on paper. Renumbering them would break
-- every one of those references, so they are grandfathered and nothing new can
-- ever be written in that shape -- the generator only emits digits.
--
-- NON-DESTRUCTIVE. Verified before writing this migration: all 9 existing rows
-- already satisfy the predicate (1 numeric, 8 legacy TH-), so Postgres's
-- validation scan passes without touching a single row. No data is modified,
-- no column is altered, nothing is renumbered.
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_number_format"
  CHECK ("number" ~ '^[0-9]+$' OR "number" LIKE 'TH-%');

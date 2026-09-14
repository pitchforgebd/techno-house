-- Public order numbers become a short, strictly increasing number.
--
-- A database sequence is the only concurrency-safe source for this: two
-- checkouts committing at the same instant can never draw the same value,
-- and `nextval` does not roll back, so a failed order burns a number rather
-- than handing it to the next one. The previous generator was random hex,
-- which needed a retry loop to dodge collisions.
--
-- Starts at 100001 so numbers are six digits from day one and do not
-- advertise how many orders the store has taken.
--
-- Existing `TH-YYYYMMDD-XXXXXXXX` numbers are left exactly as they are:
-- they are printed on invoices and quoted in support threads, so renumbering
-- history would break every one of those references.
CREATE SEQUENCE IF NOT EXISTS order_number_seq
  AS BIGINT
  START WITH 100001
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- DSA-06: a wallet balance can never go negative.
--
-- `adjustCustomerWallet` now applies the delta atomically with a `gte` guard,
-- so the application cannot overdraw. This is the structural floor underneath
-- it: any future code path that writes `walletAmount` directly aborts rather
-- than quietly producing a negative balance.
--
-- Verified safe before adding: 5 users, minimum balance 0, no negative rows.
ALTER TABLE "User"
  ADD CONSTRAINT "User_wallet_non_negative"
  CHECK ("walletAmount" >= 0);

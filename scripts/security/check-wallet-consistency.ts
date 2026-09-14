/**
 * Wallet consistency suite (DSA-06).
 *
 *   npm run test:wallet
 *
 * `adjustCustomerWallet` used to read the balance, add the delta in JavaScript
 * and write the absolute result. Under Postgres READ COMMITTED two concurrent
 * adjustments both read the same starting balance and both wrote the same
 * total, so one was silently lost and the `WalletTransaction` ledger stopped
 * summing to `User.walletAmount`.
 *
 * The invariant these tests defend is the one that matters for money:
 *
 *   User.walletAmount === SUM(WalletTransaction.amount)
 *
 * Fixtures are created under `@techno-house.invalid` and removed in `finally`.
 * No pre-existing customer, balance or ledger row is read or written.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import { adjustCustomerWallet } from "../../lib/admin/save-customer";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  const prisma = getPrisma();
  const stamp = Date.now();
  const userIds: string[] = [];

  const staff = await prisma.staff.findFirst({ select: { id: true, email: true } });
  if (!staff) {
    console.error("fail fixtures — need at least one staff row.");
    process.exitCode = 1;
    return;
  }
  const actor = { staffId: staff.id, email: staff.email };

  try {
    let seq = 0;
    async function makeCustomer(startingBalance: number): Promise<string> {
      seq += 1;
      const user = await prisma.user.create({
        data: {
          email: `wallet-${seq}-${stamp}@techno-house.invalid`,
          fullName: `Wallet ${seq}`,
          phone: `013${String(stamp).slice(-7)}${seq}`,
          status: "ACTIVE",
          walletAmount: startingBalance,
        },
        select: { id: true },
      });
      userIds.push(user.id);
      return user.id;
    }

    /** The invariant: balance must equal the sum of the ledger. */
    async function ledgerMatchesBalance(userId: string): Promise<{
      balance: number;
      ledger: number;
    }> {
      const [user, sum] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { walletAmount: true },
        }),
        prisma.walletTransaction.aggregate({
          where: { userId },
          _sum: { amount: true },
        }),
      ]);
      return {
        balance: user?.walletAmount ?? -1,
        ledger: sum._sum.amount ?? 0,
      };
    }

    // --- Case 1: concurrent credits -----------------------------------------
    const creditUser = await makeCustomer(0);
    await Promise.all(
      Array.from({ length: 5 }, () =>
        adjustCustomerWallet({ id: creditUser, amount: 500, reason: "credit", actor }),
      ),
    );
    const credited = await ledgerMatchesBalance(creditUser);
    check(
      "five concurrent credits all land",
      credited.balance === 2500,
      `balance=${credited.balance}, expected 2500`,
    );
    check(
      "ledger matches balance after concurrent credits",
      credited.balance === credited.ledger,
      `balance=${credited.balance} ledger=${credited.ledger}`,
    );

    // --- Case 2: concurrent debits cannot overdraw --------------------------
    // Balance 1000, five concurrent debits of 500. At most two can succeed.
    const debitUser = await makeCustomer(1000);
    const debits = await Promise.all(
      Array.from({ length: 5 }, () =>
        adjustCustomerWallet({ id: debitUser, amount: -500, reason: "debit", actor }),
      ),
    );
    const succeeded = debits.filter((r) => r.ok).length;
    const debited = await ledgerMatchesBalance(debitUser);
    check(
      "concurrent debits cannot overdraw the balance",
      debited.balance >= 0,
      `balance=${debited.balance}`,
    );
    check(
      "at most two debits of 500 succeed against a balance of 1000",
      succeeded <= 2,
      `${succeeded} debits succeeded`,
    );
    check(
      "ledger matches balance after concurrent debits",
      debited.balance === 1000 + debited.ledger,
      `balance=${debited.balance} startingBalance+ledger=${1000 + debited.ledger}`,
    );

    // --- Case 3: mixed credits and debits -----------------------------------
    const mixedUser = await makeCustomer(1000);
    await Promise.all([
      adjustCustomerWallet({ id: mixedUser, amount: 300, reason: "c", actor }),
      adjustCustomerWallet({ id: mixedUser, amount: -200, reason: "d", actor }),
      adjustCustomerWallet({ id: mixedUser, amount: 700, reason: "c", actor }),
      adjustCustomerWallet({ id: mixedUser, amount: -100, reason: "d", actor }),
    ]);
    const mixed = await ledgerMatchesBalance(mixedUser);
    check(
      "mixed concurrent credits and debits all land",
      mixed.balance === 1700,
      `balance=${mixed.balance}, expected 1700`,
    );
    check(
      "ledger matches balance after mixed traffic",
      mixed.balance === 1000 + mixed.ledger,
      `balance=${mixed.balance} startingBalance+ledger=${1000 + mixed.ledger}`,
    );

    // --- Case 4: a single over-deduction is still refused --------------------
    const floorUser = await makeCustomer(100);
    const overdraw = await adjustCustomerWallet({
      id: floorUser,
      amount: -500,
      reason: "overdraw",
      actor,
    });
    check("deducting more than the balance is refused", !overdraw.ok);
    const floor = await ledgerMatchesBalance(floorUser);
    check(
      "a refused deduction writes no ledger row",
      floor.balance === 100 && floor.ledger === 0,
      `balance=${floor.balance} ledger=${floor.ledger}`,
    );

    // --- Case 5: exact-to-zero is allowed -----------------------------------
    const exactUser = await makeCustomer(250);
    const toZero = await adjustCustomerWallet({
      id: exactUser,
      amount: -250,
      reason: "zero",
      actor,
    });
    check(
      "deducting exactly the balance is allowed",
      toZero.ok,
      toZero.ok ? undefined : toZero.formError,
    );
    const zeroed = await ledgerMatchesBalance(exactUser);
    check(
      "balance lands exactly on zero",
      zeroed.balance === 0,
      `balance=${zeroed.balance}`,
    );
  } finally {
    await prisma.walletTransaction.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`wallet consistency failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} wallet consistency checks`);
}

main().catch((error) => {
  console.error("wallet consistency crashed:", error);
  process.exitCode = 1;
});

/**
 * Authentication hardening suite (F-05, F-07).
 *
 *   npm run test:authhardening
 *
 * F-05 — staff sign-in had no lockout. The only brake was a sliding 15-minute
 * rate-limit window, which forgets everything once it expires, so a patient
 * attacker could keep guessing indefinitely. A persisted counter means waiting
 * does not reset their progress.
 *
 * F-07 — the password policy was length-only, so `password`, `12345678` and
 * `technohouse` all passed at eight characters.
 *
 * Fixtures are created under `@techno-house.invalid` and removed in `finally`.
 * No real staff account is touched.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import { hashPassword } from "../../lib/auth/password";
import {
  loginStaff,
  STAFF_LOCKOUT_THRESHOLD,
} from "../../lib/auth/staff-auth";
import {
  validateLoginInput,
  validatePassword,
} from "../../lib/account/validation";

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


/**
 * Calls `loginStaff`, tolerating only the final session-cookie write.
 *
 * A successful sign-in ends in `createStaffSession`, which sets an httpOnly
 * cookie and so needs a Next request scope a script does not have. Reaching
 * that call means the credential check, the lock check and the counter reset
 * have all already run and committed. Any OTHER error is a real failure and is
 * rethrown rather than swallowed.
 */
async function attemptLogin(
  input: Parameters<typeof loginStaff>[0],
): Promise<Awaited<ReturnType<typeof loginStaff>>> {
  try {
    return await loginStaff(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("outside a request scope")) {
      return { ok: true };
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const prisma = getPrisma();
  const stamp = Date.now();

  // --- F-07: password policy ----------------------------------------------
  for (const weak of [
    "password",
    "Password1",
    "password123",
    "12345678",
    "123456789",
    "qwertyui",
    "abcdefgh",
    "aaaaaaaa",
    "11111111",
    "letmein123",
    "admin123",
    "technohouse",
    "welcome1",
    "iloveyou",
  ]) {
    check(
      `"${weak}" is rejected`,
      validatePassword(weak) !== null,
      "accepted a password from common stuffing lists",
    );
  }

  check(
    "a password containing the account's own email local-part is rejected",
    validatePassword("rakib1234secure", { email: "rakib1234@example.com" }) !==
      null,
  );
  check(
    "a password containing the account holder's name is rejected",
    validatePassword("kamalhossain99", { fullName: "Kamal Hossain" }) !== null,
  );

  // Genuinely reasonable passwords must still be accepted, or the policy just
  // pushes people toward writing them down.
  for (const good of [
    "correct-horse-battery",
    "Tk9!mzqPvw",
    "bright-lamp-window-42",
    "n7Qv2LpXr",
  ]) {
    check(
      `"${good}" is accepted`,
      validatePassword(good) === null,
      `rejected: ${validatePassword(good)}`,
    );
  }
  check(
    "the 8-character floor still applies",
    validatePassword("Tk9!mz") !== null,
  );

  // The regression this guards against: strength rules must NOT run at
  // sign-in. An account created before the rules existed would otherwise be
  // locked out of its own login with no way to fix it, since password reset is
  // not implemented. Sign-in checks presence only.
  check(
    "a legacy weak password can still SIGN IN",
    validateLoginInput({ email: "legacy@example.com", password: "password123" })
      .password === undefined,
    "strength rules ran at sign-in and would lock out existing accounts",
  );
  check(
    "a legacy short password can still SIGN IN",
    validateLoginInput({ email: "legacy@example.com", password: "abc" })
      .password === undefined,
  );
  check(
    "sign-in still requires a password to be supplied",
    validateLoginInput({ email: "legacy@example.com", password: "" })
      .password !== undefined,
  );

  // --- F-05: staff lockout -------------------------------------------------
  const email = `lockout-${stamp}@techno-house.invalid`;
  const realPassword = "bright-lamp-window-42";
  const staff = await prisma.staff.create({
    data: {
      email,
      fullName: "Lockout Fixture",
      phone: `017${String(stamp).slice(-8)}`,
      passwordHash: await hashPassword(realPassword),
      status: "ACTIVE",
    },
    select: { id: true },
  });

  try {
    // The email rate-limit bucket would bite long before the lockout threshold,
    // so drive the counter directly to isolate the lockout behaviour.
    await prisma.staff.update({
      where: { id: staff.id },
      data: { failedLoginAttempts: STAFF_LOCKOUT_THRESHOLD - 1 },
    });
    await prisma.authRateLimit.deleteMany({
      where: { bucketKey: { startsWith: "staff.login." } },
    });

    const trip = await attemptLogin({ email, password: "definitely-wrong-pw" });
    check("the failing attempt is refused", !trip.ok);

    const afterTrip = await prisma.staff.findUnique({
      where: { id: staff.id },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });
    check(
      "crossing the threshold locks the account",
      afterTrip?.lockedUntil instanceof Date &&
        afterTrip.lockedUntil > new Date(),
      `lockedUntil=${afterTrip?.lockedUntil}`,
    );
    check(
      "the failure counter persisted",
      afterTrip?.failedLoginAttempts === STAFF_LOCKOUT_THRESHOLD,
      `attempts=${afterTrip?.failedLoginAttempts}`,
    );

    // The point of persistence: clearing the rate-limit window does not unlock.
    await prisma.authRateLimit.deleteMany({
      where: { bucketKey: { startsWith: "staff.login." } },
    });
    const whileLocked = await attemptLogin({ email, password: realPassword });
    check(
      "the CORRECT password is refused while locked",
      !whileLocked.ok,
      whileLocked.ok ? "the lock did not hold" : undefined,
    );
    check(
      "clearing the rate-limit window does not lift the lock",
      !whileLocked.ok,
    );

    // Releasing the lock lets the real owner back in, and clears the counter.
    await prisma.staff.update({
      where: { id: staff.id },
      data: { lockedUntil: null },
    });
    await prisma.authRateLimit.deleteMany({
      where: { bucketKey: { startsWith: "staff.login." } },
    });
    const afterRelease = await attemptLogin({ email, password: realPassword });
    check(
      "the real owner can sign in once the lock expires",
      afterRelease.ok,
      afterRelease.ok ? undefined : JSON.stringify(afterRelease),
    );
    const afterSuccess = await prisma.staff.findUnique({
      where: { id: staff.id },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });
    check(
      "a successful sign-in resets the counter",
      afterSuccess?.failedLoginAttempts === 0 &&
        afterSuccess.lockedUntil === null,
      `attempts=${afterSuccess?.failedLoginAttempts} lockedUntil=${afterSuccess?.lockedUntil}`,
    );
  } finally {
    await prisma.staffSession.deleteMany({ where: { staffId: staff.id } });
    await prisma.staff.delete({ where: { id: staff.id } });
    await prisma.authRateLimit.deleteMany({
      where: { bucketKey: { startsWith: "staff.login." } },
    });
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`auth hardening failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} auth hardening checks`);
}

main().catch((error) => {
  console.error("auth hardening suite crashed:", error);
  process.exitCode = 1;
});

import { PrismaPg } from "@prisma/adapter-pg";
import { getEnv } from "@/lib/env";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * PrismaClient singleton (P10-T02).
 *
 * Server-only. Call `getPrisma()` from repositories in `lib/data`, never from a
 * component: presentation code talks to repository interfaces, not to the ORM
 * (see docs/ARCHITECTURE.md).
 *
 * The client is created on first use rather than at import time. Constructing
 * it eagerly would validate `DATABASE_URL` and open a pool merely because a
 * module was imported, which would break both `DATA_SOURCE=mock` and builds on
 * machines with no database.
 *
 * Prisma 7 is Rust-free, so the connection is made through the pg driver
 * adapter rather than a `url` in the schema.
 *
 * `max: 5` and `idleTimeoutMillis: 0` are pinned explicitly (Phase 14) as
 * defensive bounds on the pool — see the real bug below, which is what
 * actually caused every prior `next build` to fail with
 * `P2037 TooManyConnections` / `P1017 Server has closed the connection`.
 */

/** Bump when schema adds models that must discard a stale globalThis client. */
const PRISMA_CLIENT_EPOCH = 31;

function createPrismaClient(): PrismaClient {
  const { databaseUrl, isProduction } = getEnv();
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 0,
  });

  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["warn", "error"],
  });
}

/**
 * Next.js dev reloads modules on every change; without this cache each reload
 * would open a new connection pool until PostgreSQL refuses connections.
 * `__technoHousePrisma` itself is only mirrored into `globalThis` outside
 * production (see below) — it exists purely to survive a dev module reload,
 * which is the only place a fresh module evaluation can otherwise discard a
 * perfectly good client.
 *
 * `__technoHousePrismaEpoch`, however, MUST be written unconditionally
 * (Phase 14 fix). It used to be written only when `!isProduction`, but
 * `isStaleClient` reads it unconditionally to validate the plain
 * module-level `client` variable below — including in production, where
 * `client` persists across calls just fine within one process. With the
 * epoch never written there, every `getPrisma()` call saw a permanent
 * mismatch (`undefined !== PRISMA_CLIENT_EPOCH`) and treated an already-live
 * client as stale, silently opening a brand-new `PrismaClient` (and a new
 * connection pool) on every single call instead of reusing it. That's what
 * was actually exhausting Postgres's `max_connections` during `next build`
 * (and would have done the same in a long-lived production server) — not
 * build worker count or parallelism, both of which were red herrings.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  __technoHousePrisma?: PrismaClient;
  __technoHousePrismaEpoch?: number;
};

let client: PrismaClient | undefined;

function isStaleClient(instance: PrismaClient | undefined): boolean {
  if (!instance) {
    return true;
  }
  if (globalForPrisma.__technoHousePrismaEpoch !== PRISMA_CLIENT_EPOCH) {
    return true;
  }
  // Schema regenerate can leave an old singleton without new delegates.
  return typeof instance.paymentGatewaySetting?.findUnique !== "function";
}

/**
 * Hand a discarded client back its connections. Dropping the reference is
 * not enough: the pg pool it owns stays open and keeps its sockets until
 * the process exits. Every `PRISMA_CLIENT_EPOCH` bump discards a client, so
 * without this a few schema changes during one `next dev` session walk the
 * database up to `max_connections` and every query then fails with
 * "remaining connection slots are reserved for non-replication superuser
 * connections" — the same exhaustion the epoch comment above describes,
 * arriving by a different route.
 */
function releaseClient(instance: PrismaClient | undefined): void {
  if (!instance) {
    return;
  }
  // Fire and forget: the caller needs a working client now, and a failure
  // to close a pool we have already stopped using is not worth surfacing.
  void instance.$disconnect().catch(() => {});
}

export function getPrisma(): PrismaClient {
  if (client && !isStaleClient(client)) {
    return client;
  }

  if (client) {
    releaseClient(client);
    client = undefined;
  }

  if (isStaleClient(globalForPrisma.__technoHousePrisma)) {
    releaseClient(globalForPrisma.__technoHousePrisma);
    globalForPrisma.__technoHousePrisma = undefined;
  }

  client = globalForPrisma.__technoHousePrisma ?? createPrismaClient();
  globalForPrisma.__technoHousePrismaEpoch = PRISMA_CLIENT_EPOCH;

  if (!getEnv().isProduction) {
    globalForPrisma.__technoHousePrisma = client;
  }

  return client;
}

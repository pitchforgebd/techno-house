/**
 * Connectivity smoke check (P10-T02).
 *
 * Opens a real connection with the same driver adapter the app uses and runs a
 * trivial query. Run it after changing DATABASE_URL or the database setup:
 *
 *   npm run db:check
 *
 * Uses relative imports and its own client so it stays runnable outside the
 * Next.js build, where the `@/` path aliases do not exist.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnvFiles } from "dotenv";
import { PrismaClient } from "../../lib/generated/prisma/client";

type CheckRow = { database: string; server_version: string };

async function main(): Promise<void> {
  loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is not set — see docs/DATABASE.md.");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [row] = await prisma.$queryRaw<CheckRow[]>`
      SELECT current_database() AS database,
             current_setting('server_version') AS server_version
    `;
    console.log(
      `ok — connected to ${row?.database} (PostgreSQL ${row?.server_version})`,
    );
  } catch (error) {
    // Never print the connection string: it contains a password.
    console.error(
      "failed —",
      error instanceof Error ? error.message : "unknown error",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();

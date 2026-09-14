/**
 * Server-side environment access (P10-T01).
 *
 * Read configuration through `getEnv()` instead of touching `process.env`
 * directly, so a missing or malformed value fails fast with a clear message
 * during boot rather than deep inside a query.
 *
 * Never import this from a Client Component: `DATABASE_URL` carries a
 * password and must not reach the browser bundle.
 */

export type NodeEnv = "development" | "test" | "production";

export type AppEnv = {
  /** PostgreSQL connection string. Owned by the data layer only. */
  databaseUrl: string;
  nodeEnv: NodeEnv;
  isProduction: boolean;
};

let cached: AppEnv | null = null;

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/env is server-only. Do not import it from a Client Component.",
    );
  }
}

function readNodeEnv(): NodeEnv {
  const value = process.env.NODE_ENV;
  if (value === "production" || value === "test") {
    return value;
  }
  return "development";
}

/**
 * Validates shape only. The value is never echoed back in errors, because it
 * contains credentials.
 */
function readDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and set it — " +
        "see docs/DATABASE.md for local setup.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is not a valid connection URL.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(
      "DATABASE_URL must be a postgresql:// connection string. Techno House " +
        "targets PostgreSQL only.",
    );
  }
  if (!parsed.hostname) {
    throw new Error("DATABASE_URL is missing a host.");
  }
  if (parsed.pathname.replace("/", "") === "") {
    throw new Error("DATABASE_URL is missing a database name.");
  }

  return value;
}

/** Reads and validates the environment once per process. */
export function getEnv(): AppEnv {
  assertServer();
  if (cached) {
    return cached;
  }

  const nodeEnv = readNodeEnv();
  cached = {
    databaseUrl: readDatabaseUrl(),
    nodeEnv,
    isProduction: nodeEnv === "production",
  };
  return cached;
}

/** Test helper: forces the next `getEnv()` call to re-read `process.env`. */
export function resetEnvCache(): void {
  cached = null;
}

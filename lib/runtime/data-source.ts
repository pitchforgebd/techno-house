/**
 * Runtime data source. Catalogue and admin loaders use PostgreSQL.
 * `DATA_SOURCE=mock` is forbidden for a workable store — keep the check
 * only so old local env files fail loudly instead of silently showing fiction.
 */
export function isMockDataSource(): boolean {
  return process.env.DATA_SOURCE === "mock";
}

export function assertDatabaseRequired(feature: string): void {
  if (isMockDataSource()) {
    throw new Error(
      `${feature} needs PostgreSQL. Remove DATA_SOURCE=mock from .env.local.`,
    );
  }
}

/** Prefer database. Mock mode is unsupported for storefront/admin operations. */
export function usesDatabase(): boolean {
  return !isMockDataSource();
}

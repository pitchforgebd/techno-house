/**
 * Pure permission helpers — safe for Client Components.
 * Server mutations use `staffWithPermission` in `permissions.ts`.
 */
export function hasPermission(
  session: { permissions: readonly string[] } | null | undefined,
  key: string,
): boolean {
  return Boolean(session?.permissions.includes(key));
}

export function hasAnyPermission(
  session: { permissions: readonly string[] } | null | undefined,
  keys: readonly string[],
): boolean {
  if (!session || keys.length === 0) {
    return false;
  }
  return keys.some((key) => session.permissions.includes(key));
}

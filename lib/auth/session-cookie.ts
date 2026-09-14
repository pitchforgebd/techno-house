/**
 * Shared httpOnly cookie flags for opaque sessions (P11-T03).
 * Cookie names and paths stay caller-specific.
 */
export function opaqueSessionCookieFlags(path: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path,
  };
}

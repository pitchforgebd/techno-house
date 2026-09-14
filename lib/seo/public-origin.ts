/** Public origin for sitemap / robots / feed absolute URLs. Not a secret. */
export function publicOrigin(): string {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  return "http://127.0.0.1:3000";
}

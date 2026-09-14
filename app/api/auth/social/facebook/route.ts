import { startOAuthFlow } from "@/lib/social/oauth-route-handlers";

export async function GET(request: Request) {
  return startOAuthFlow("FACEBOOK", request);
}

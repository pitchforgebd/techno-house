import { handleOAuthCallback } from "@/lib/social/oauth-route-handlers";

export async function GET(request: Request) {
  return handleOAuthCallback("GOOGLE", request);
}

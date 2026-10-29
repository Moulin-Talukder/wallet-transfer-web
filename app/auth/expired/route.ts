import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Server Components cannot delete cookies, so lib/dal.ts redirects here when the API
 * answers 401 (expired or revoked token). Clearing the cookie also stops the proxy
 * from bouncing the user from /login back to /dashboard.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?expired=1", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

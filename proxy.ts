import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Optimistic route guard: it only checks that a session cookie exists. Whether the
 * token is still valid is decided by Laravel on every API call (see lib/dal.ts).
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, static files and the cookie-clearing route.
  matcher: ["/((?!_next/static|_next/image|auth/expired|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};

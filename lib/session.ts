import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/** Fallback if the API ever returns a token without an expiry. Matches SANCTUM_EXPIRATION. */
const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * The Sanctum token lives only in this cookie: httpOnly so page scripts (and any
 * XSS) cannot read it, sameSite=lax so it is not sent on cross-site POSTs, and
 * secure in production. It expires together with the token.
 * Only callable from Server Actions and Route Handlers.
 */
export async function setSessionToken(token: string, expiresAt: string | null): Promise<void> {
  const expiresMs = expiresAt ? Date.parse(expiresAt) - Date.now() : Number.NaN;
  const maxAge = Number.isFinite(expiresMs) ? Math.max(0, Math.floor(expiresMs / 1000)) : DEFAULT_MAX_AGE_SECONDS;

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionToken(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

"use server";

import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import type { LoginResponse } from "@/lib/api/types";
import { describeFailure } from "@/lib/errors";
import { loginSchema, type LoginValues } from "@/lib/login-schema";
import { clearSessionToken, getSessionToken, setSessionToken } from "@/lib/session";

export type LoginResult = { ok: false; message: string };

/**
 * BFF login: the browser posts credentials to this action, the action exchanges them
 * with Laravel for a token and stores it in an httpOnly cookie. The token is never
 * returned to the browser.
 */
export async function login(values: LoginValues): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Enter a valid email address and password." };

  const result = await apiRequest<LoginResponse>("/login", { method: "POST", body: parsed.data });

  if (!result.ok) {
    // The API answers every bad email/password combination with the same 422.
    if (result.error.kind === "validation") return { ok: false, message: "Incorrect email or password." };
    if (result.error.kind === "rate_limited") {
      return { ok: false, message: `Too many sign-in attempts. ${describeFailure(result.error).message}` };
    }
    if (result.error.kind === "network") {
      return { ok: false, message: "Can't reach the server. Check your connection and try again." };
    }
    return { ok: false, message: "Sign-in failed. Please try again." };
  }

  await setSessionToken(result.data.token, result.data.expires_at);
  redirect("/dashboard");
}

/** Revokes the token on the API (best effort) and always clears the local session. */
export async function logout(): Promise<void> {
  const token = await getSessionToken();
  if (token) await apiRequest("/logout", { method: "POST", token });

  await clearSessionToken();
  redirect("/login");
}

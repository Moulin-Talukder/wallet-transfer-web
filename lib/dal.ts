import "server-only";

import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import type { Paginated, Transfer, User, Wallet } from "@/lib/api/types";
import { getSessionToken } from "@/lib/session";

/**
 * Data access for Server Components. Rendering cannot modify cookies, so on a 401
 * we redirect to a Route Handler that clears the cookie and then sends the user to /login.
 */
export const SESSION_EXPIRED_PATH = "/auth/expired";

async function authedGet<T>(path: string): Promise<T> {
  const token = await getSessionToken();
  if (!token) redirect("/login");

  const result = await apiRequest<T>(path, { token });
  if (result.ok) return result.data;

  if (result.error.kind === "unauthenticated") redirect(SESSION_EXPIRED_PATH);
  // Caught by the nearest error.tsx, which offers a retry.
  throw new Error(`GET ${path} failed: ${result.error.kind}`);
}

export async function getCurrentUser(): Promise<User> {
  return (await authedGet<{ data: User }>("/me")).data;
}

export async function getWallet(): Promise<Wallet> {
  return (await authedGet<{ data: Wallet }>("/wallet")).data;
}

export async function getTransfers(page = 1): Promise<Paginated<Transfer>> {
  const { data, meta } = await authedGet<Paginated<Transfer>>(`/transfers?page=${page}`);
  return { data, meta };
}

import "server-only";

import { toApiFailure } from "@/lib/api/parse";
import type { ApiFailure } from "@/lib/api/types";

export type ApiResult<T> =
  | { ok: true; status: number; data: T; headers: Headers }
  | { ok: false; error: ApiFailure };

type RequestOptions = {
  method?: "GET" | "POST";
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

const TIMEOUT_MS = 10_000;

function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new Error("API_URL is not set. Copy .env.example to .env.local.");
  return `${base.replace(/\/+$/, "")}/api${path}`;
}

/**
 * Server-side fetch to Laravel. This module is the only place that sees the bearer
 * token in flight; `server-only` makes importing it from a Client Component a build error.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Connection refused, DNS failure or timeout. For a POST the outcome is unknown.
    return { ok: false, error: { kind: "network" } };
  }

  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, error: toApiFailure(response.status, body, response.headers.get("Retry-After")) };
  }
  return { ok: true, status: response.status, data: body as T, headers: response.headers };
}

/** Response shapes of the Laravel wallet API (see its Http/Resources). */

export type User = { name: string; email: string };

export type Wallet = { balance: number; currency: string; is_frozen: boolean };

export type TransferDirection = "in" | "out";

export type Transfer = {
  reference: string;
  /** Integer paisa. */
  amount: number;
  currency: string;
  status: string;
  direction: TransferDirection;
  created_at: string;
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type Paginated<T> = { data: T[]; meta: PaginationMeta };

export type LoginResponse = { token: string; token_type: "Bearer"; expires_at: string | null };

export const BUSINESS_ERROR_CODES = [
  "INSUFFICIENT_BALANCE",
  "SAME_WALLET",
  "RECEIVER_UNAVAILABLE",
  "SENDER_FROZEN",
  "IDEMPOTENCY_KEY_REUSED",
] as const;

export type BusinessErrorCode = (typeof BUSINESS_ERROR_CODES)[number];

/**
 * Every way an API call can fail, normalized once so UI code can branch on
 * `kind` (and `code`) instead of on status numbers or message strings.
 * Plain data only: it crosses the server action boundary to the browser.
 */
export type ApiFailure =
  | { kind: "validation"; message: string; fieldErrors: Record<string, string[]> }
  | { kind: "business"; code: BusinessErrorCode; message: string }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message: string }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "network" }
  | { kind: "server"; status: number };

import { BUSINESS_ERROR_CODES, type ApiFailure, type BusinessErrorCode } from "@/lib/api/types";

/** Turns a non-2xx Laravel response into an ApiFailure. */
export function toApiFailure(status: number, body: unknown, retryAfter: string | null): ApiFailure {
  const json = isRecord(body) ? body : {};
  const message = typeof json.message === "string" ? json.message : "";

  switch (status) {
    case 401:
      return { kind: "unauthenticated" };
    case 403:
      return { kind: "forbidden", message };
    case 429:
      return { kind: "rate_limited", retryAfterSeconds: parseRetryAfter(retryAfter) };
    case 422:
      if (isBusinessCode(json.code)) return { kind: "business", code: json.code, message };
      return { kind: "validation", message, fieldErrors: toFieldErrors(json.errors) };
    default:
      return { kind: "server", status };
  }
}

/** Retry-After is either delta-seconds or an HTTP date. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  if (!value) return null;
  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

function isBusinessCode(code: unknown): code is BusinessErrorCode {
  return typeof code === "string" && (BUSINESS_ERROR_CODES as readonly string[]).includes(code);
}

function toFieldErrors(errors: unknown): Record<string, string[]> {
  if (!isRecord(errors)) return {};
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages)) result[field] = messages.filter((m): m is string => typeof m === "string");
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

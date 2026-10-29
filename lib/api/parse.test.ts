import { describe, expect, it } from "vitest";
import { parseRetryAfter, toApiFailure } from "@/lib/api/parse";

describe("toApiFailure", () => {
  it("maps a 422 with a known code to a business failure", () => {
    expect(toApiFailure(422, { message: "Insufficient balance.", code: "INSUFFICIENT_BALANCE" }, null)).toEqual({
      kind: "business",
      code: "INSUFFICIENT_BALANCE",
      message: "Insufficient balance.",
    });
  });

  it("maps a 422 without a code to field validation errors", () => {
    const body = {
      message: "You cannot transfer money to yourself.",
      errors: { receiver_email: ["You cannot transfer money to yourself."], amount: ["Too small", 42] },
    };
    expect(toApiFailure(422, body, null)).toEqual({
      kind: "validation",
      message: "You cannot transfer money to yourself.",
      fieldErrors: { receiver_email: ["You cannot transfer money to yourself."], amount: ["Too small"] },
    });
  });

  it("treats an unknown code as a validation error rather than trusting it", () => {
    expect(toApiFailure(422, { message: "?", code: "SOMETHING_NEW" }, null)).toMatchObject({ kind: "validation" });
  });

  it.each([
    [401, { kind: "unauthenticated" }],
    [403, { kind: "forbidden", message: "This action is unauthorized." }],
    [500, { kind: "server", status: 500 }],
    [503, { kind: "server", status: 503 }],
  ])("maps %i", (status, expected) => {
    expect(toApiFailure(status, { message: "This action is unauthorized." }, null)).toEqual(expected);
  });

  it("maps a 429 and reads Retry-After", () => {
    expect(toApiFailure(429, { message: "Too Many Attempts." }, "37")).toEqual({
      kind: "rate_limited",
      retryAfterSeconds: 37,
    });
  });

  it("survives a non-JSON body", () => {
    expect(toApiFailure(422, null, null)).toEqual({ kind: "validation", message: "", fieldErrors: {} });
    expect(toApiFailure(502, "<html>Bad gateway</html>", null)).toEqual({ kind: "server", status: 502 });
  });
});

describe("parseRetryAfter", () => {
  it("parses delta-seconds", () => {
    expect(parseRetryAfter("60")).toBe(60);
  });

  it("parses an HTTP date relative to now", () => {
    const now = Date.parse("2026-10-29T10:00:00Z");
    expect(parseRetryAfter("Thu, 29 Oct 2026 10:00:30 GMT", now)).toBe(30);
    expect(parseRetryAfter("Thu, 29 Oct 2026 09:59:00 GMT", now)).toBe(0);
  });

  it("returns null when missing or unparseable", () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("soon")).toBeNull();
  });
});

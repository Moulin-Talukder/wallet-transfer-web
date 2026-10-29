import { describe, expect, it } from "vitest";
import type { ApiFailure, BusinessErrorCode } from "@/lib/api/types";
import { BUSINESS_ERROR_CODES } from "@/lib/api/types";
import { describeFailure, transferFieldErrors } from "@/lib/errors";

describe("describeFailure", () => {
  it.each<[BusinessErrorCode, string]>([
    ["INSUFFICIENT_BALANCE", "Insufficient balance"],
    ["SAME_WALLET", "That's your own wallet"],
    ["RECEIVER_UNAVAILABLE", "Receiver can't accept money"],
    ["SENDER_FROZEN", "Your wallet is frozen"],
    ["IDEMPOTENCY_KEY_REUSED", "Transfer details changed"],
  ])("maps %s to a clear, non-retryable message", (code, title) => {
    const message = describeFailure({ kind: "business", code, message: "raw server text" });
    expect(message.title).toBe(title);
    expect(message.message).not.toContain("raw server text");
    expect(message.retryable).toBe(false);
  });

  it("has copy for every business code the API defines", () => {
    for (const code of BUSINESS_ERROR_CODES) {
      expect(describeFailure({ kind: "business", code, message: "" }).message.length).toBeGreaterThan(10);
    }
  });

  it("explains a 403 as a frozen wallet", () => {
    expect(describeFailure({ kind: "forbidden", message: "This action is unauthorized." }).title).toBe(
      "Your wallet is frozen",
    );
  });

  it.each([
    [1, "Please wait 1 second and try again."],
    [30, "Please wait 30 seconds and try again."],
    [90, "Please wait 2 minutes and try again."],
    [null, "Please wait a moment and try again."],
  ])("tells the user how long to wait after a 429 (Retry-After %s)", (retryAfterSeconds, text) => {
    const message = describeFailure({ kind: "rate_limited", retryAfterSeconds });
    expect(message.message).toBe(text);
    expect(message.retryable).toBe(true);
  });

  it.each<ApiFailure>([{ kind: "network" }, { kind: "server", status: 500 }])(
    "reassures that retrying %o is safe",
    (failure) => {
      const message = describeFailure(failure);
      expect(message.retryable).toBe(true);
      expect(message.message).toMatch(/won't be charged twice/);
    },
  );

  it("shows the first validation message", () => {
    const failure: ApiFailure = { kind: "validation", message: "x", fieldErrors: { amount: ["Too small"] } };
    expect(describeFailure(failure).message).toBe("Too small");
  });
});

describe("transferFieldErrors", () => {
  it("maps Laravel field names onto form fields", () => {
    const failure: ApiFailure = {
      kind: "validation",
      message: "",
      fieldErrors: {
        receiver_email: ["You cannot transfer money to yourself."],
        amount: ["The amount field must be an integer."],
        idempotency_key: ["ignored"],
      },
    };
    expect(transferFieldErrors(failure)).toEqual({
      receiverEmail: "You cannot transfer money to yourself.",
      amount: "The amount field must be an integer.",
    });
  });

  it("rewrites Laravel's generic `exists` message", () => {
    const failure: ApiFailure = {
      kind: "validation",
      message: "",
      fieldErrors: { receiver_email: ["The selected receiver email is invalid."] },
    };
    expect(transferFieldErrors(failure)).toEqual({ receiverEmail: "We couldn't find an account with that email." });
  });

  it("returns nothing for non-validation failures", () => {
    expect(transferFieldErrors({ kind: "network" })).toEqual({});
  });
});

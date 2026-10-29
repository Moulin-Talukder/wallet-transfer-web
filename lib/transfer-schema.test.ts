import { describe, expect, it } from "vitest";
import { AMOUNT_RANGE_MESSAGE, toTransferPayload } from "@/lib/transfer-schema";

describe("toTransferPayload", () => {
  it("converts the amount to integer paisa and normalizes the email", () => {
    expect(toTransferPayload({ receiverEmail: "  Bob@Example.com ", amount: "1,500.50" })).toEqual({
      ok: true,
      payload: { receiverEmail: "bob@example.com", amountPaisa: 150050 },
    });
  });

  it.each([
    ["0.99", AMOUNT_RANGE_MESSAGE],
    ["50000.01", AMOUNT_RANGE_MESSAGE],
    ["1.001", "Use at most 2 decimal places."],
    ["", "Enter an amount."],
  ])("rejects amount %j", (amount, message) => {
    expect(toTransferPayload({ receiverEmail: "bob@example.com", amount })).toEqual({
      ok: false,
      fieldErrors: { amount: message },
    });
  });

  it("accepts the exact limits", () => {
    expect(toTransferPayload({ receiverEmail: "bob@example.com", amount: "1" }).ok).toBe(true);
    expect(toTransferPayload({ receiverEmail: "bob@example.com", amount: "50,000.00" }).ok).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(toTransferPayload({ receiverEmail: "bob@", amount: "10" })).toEqual({
      ok: false,
      fieldErrors: { receiverEmail: "Enter a valid email address." },
    });
  });
});
